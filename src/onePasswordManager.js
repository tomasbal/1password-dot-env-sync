const sdk = require("@1password/sdk");
const inquirer = require('inquirer').default;
const { loadConfig } = require('./configManager');

async function getCredentials(options) {
  let token;

  try {
    const config = await loadConfig();
    token = config.token;
  } catch (error) {
    console.warn(`Warning: ${error.message}`);
    console.log('Falling back to environment variables or user input.');
  }

  token = token || process.env.OP_SERVICE_ACCOUNT_TOKEN || options.opToken;

  if (!token) {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your 1Password service account token:',
      },
    ]);

    token = answers.token;
  }

  if (!token) {
    throw new Error('1Password service account token must be provided');
  }

  return token;
}

async function initializeOnePassword(options) {
  try {
    const token = await getCredentials(options);
    console.log('Token received:', token ? 'Token present' : 'Token missing');

    if (!token) {
      throw new Error('Token is missing or invalid');
    }

    console.log('Initializing 1Password client...');
    const client = await sdk.createClient({
      auth: token,
      integrationName: "1Password ENV Sync",
      integrationVersion: "v1.0.0",
    });
    console.log('1Password client initialized');

    // Test the client by trying to list vaults
    console.log('Attempting to list vaults...');
    const vaults = await client.vaults.listAll();

    return client;
  } catch (error) {
    console.error('Error initializing 1Password client:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

async function selectVault(client) {
  const vaults = await client.vaults.listAll();
  console.log("Vaults retrieved:", vaults);
  const choices = vaults?.elements?.map(vault => ({ name: vault.title, value: vault.id }));

  const { vaultId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'vaultId',
      message: 'Select a vault to store/sync secrets:',
      choices,
    },
  ]);

  console.log("Vault ID selected:", vaultId);

  return vaults?.elements.find(vault => vault.id === vaultId);
}

module.exports = {
  initializeOnePassword,
  selectVault,
};