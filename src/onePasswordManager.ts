import { createClient, Client, VaultOverview } from "@1password/sdk";
import { password, select } from "@inquirer/prompts";
import { loadConfig } from './configManager';
import { logger } from './logger';

/**
 * Interface for options that may contain a 1Password token
 */
interface Options {
  opToken?: string;
  [key: string]: any;
}

/**
 * Retrieves the 1Password service account token from various sources.
 * Priority: config file > environment variable > command line option > user input
 *
 * @param {Options} options - Options object that may contain the token
 * @returns {Promise<string>} The 1Password service account token
 * @throws {Error} If no token is provided or found
 */
async function getCredentials(options: Options): Promise<string> {
  let token: string | undefined;

  try {
    const config = await loadConfig();
    token = config.token;
  } catch (error) {
    logger.warning(`Warning: ${(error as Error).message}`);
    logger.info('Falling back to environment variables or user input.');
  }

  token = token || process.env.OP_SERVICE_ACCOUNT_TOKEN || options.opToken;
  if (!token) {
    token = await password({
      message: 'Enter your 1Password service account token:',
    });
  }

  if (!token) {
    throw new Error('1Password service account token must be provided');
  }

  return token;
}

/**
 * Initializes the 1Password client using the provided or retrieved token.
 *
 * @param {Options} options - Options object that may contain the token
 * @returns {Promise<Client>} Initialized 1Password client
 * @throws {Error} If client initialization fails
 */
async function initializeOnePassword(options: Options): Promise<Client> {
  try {
    const token = await getCredentials(options);

    if (!token) {
      throw new Error('Token is missing or invalid');
    }

    const client = await createClient({
      auth: token,
      integrationName: "1Password .env sync",
      integrationVersion: "v1.0.0",
    });

    return client;
  } catch (error) {
    logger.error(`Error initializing 1Password client: ${error}`);
    logger.error(`Stack trace: ${error}`);
    throw new Error(String(error));
  }
}

/**
 * Prompts the user to select a vault from the available vaults in their 1Password account.
 *
 * @param {Client} client - Initialized 1Password client
 * @returns {Promise<VaultOverview>} Selected vault overview
 * @throws {Error} If the selected vault is not found
 */
async function selectVault(client: Client): Promise<VaultOverview> {
  logger.info('Fetching available vaults...');
  const vaultsIterable = await client.vaults.listAll();
  const vaults: VaultOverview[] = [];

  for await (const vault of vaultsIterable) {
    vaults.push(vault);
  }

  const choices = vaults.map(vault => ({
    title: vault.title,
    value: vault.id,
    description: `Title: ${vault.title}`,
  }));

  const vaultId = await select({
    message: 'Select a vault to store/sync secrets:',
    choices: choices,
  });

  logger.info(`Vault selected: ${vaultId}`);

  const selectedVault = vaults.find(vault => vault.id === vaultId);
  if (!selectedVault) {
    throw new Error('Selected vault not found');
  }

  logger.success(`Vault "${selectedVault.title}" selected successfully`);
  return selectedVault;
}

export {
  initializeOnePassword,
  selectVault,
};