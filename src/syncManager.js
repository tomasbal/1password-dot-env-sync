const fs = require('fs').promises;
const sdk = require("@1password/sdk");
const path = require('path');
const { diffLines } = require('diff');
const kleur = require('kleur');


async function syncEnvToOnePassword(client, vault, secrets) {
  // Get all items in the vault
  const { elements } = await client.items.listAll(vault.id, );

  for (const [key, value] of Object.entries(secrets)) {
    try {
      // Check if the item already exists
      const existingItem = elements.find(item => item.title === key);

      // Update existing item or create new item
      if (existingItem) {
        // Get the full item details and update the value
        let itemToUpdate = await client.items.get(existingItem.vaultId, existingItem.id);
        itemToUpdate.fields[0].value = String(value);

        // Update existing item
        await client.items.put(itemToUpdate);
        console.log(`Secret '${key}' updated in 1Password`);
      } else {
        // Create new item
        await client.items.create({
          title: key,
          category: sdk.ItemCategory.Password,
          vaultId: vault.id,
          fields: [
            {
              id: 'password',
              title: key,
              fieldType: sdk.ItemFieldType.Concealed,
              purpose: 'PASSWORD',
              value: value,
            },
          ],
          sections: null
        });
        console.log(`Secret '${key}' created in 1Password`);
      }
    } catch (error) {
      console.error(`Failed to sync secret '${key}':`, error);
    }
  }
}

async function syncOnePasswordToEnv(client, vault) {
  const items = await client.items.listAll(vault.id);
  const onePasswordSecrets = {};

  for await (const item of items) {
    if (item.category === sdk.ItemCategory.Password) {
      const fullItem = await client.items.get(item.vaultId, item.id);
      const passwordField = fullItem.fields.find(field => field.id === 'password');
      if (passwordField) {
        onePasswordSecrets[item.title] = passwordField.value;
      }
    }
  }

  const envPath = path.join(process.cwd(), '.env');
  let envContent = await fs.readFile(envPath, 'utf8');

  for (const [key, value] of Object.entries(onePasswordSecrets)) {
    const regex = new RegExp(`^${key}=.*$(\\r?\\n(?!\\s*$).*)*`, 'm');

    if (regex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(regex, (match) => {
        const originalQuotes = match.includes('"') ? '"' : (match.includes("'") ? "'" : '');
        if (value.includes('\n')) {
          // Handle multiline strings
          return `${key}=${originalQuotes}${value.replace(/\n/g, '\n')}${originalQuotes}\n`;
        } else if (value.startsWith('{') && value.endsWith('}')) {
          // Handle JSON-like structures
          return `${key}='${value}'\n`;
        } else {
          // Handle other values
          return `${key}=${originalQuotes}${value}${originalQuotes}\n`;
        }
      });
    } else {
      // Add new key
      if (value.includes('\n')) {
        envContent += `${key}="${value.replace(/\n/g, '\n')}"\n`;
      } else if (value.startsWith('{') && value.endsWith('}')) {
        envContent += `${key}='${value}'\n`;
      } else {
        envContent += `${key}="${value}"\n`;
      }
    }
  }

  await fs.writeFile(envPath, envContent);
  console.log('Secrets synced from 1Password to .env');
}

async function showDifferences(client, vault, envSecrets) {
  const items = await client.items.listAll(vault.id);
  const onePasswordSecrets = {};

  for await (const item of items) {
    if (item.category === sdk.ItemCategory.Password) {
      const fullItem = await client.items.get(item.vaultId, item.id);
      const passwordField = fullItem.fields.find(field => field.id === 'password');
      if (passwordField) {
        onePasswordSecrets[item.title] = passwordField.value;
      }
    }
  }

  const envPath = path.join(process.cwd(), '.env');
  const envContent = await fs.readFile(envPath, 'utf8');

  let diffContent = '';
  const processedKeys = new Set();

  // Process keys from .env file
  for (const [key, value] of Object.entries(envSecrets)) {
    processedKeys.add(key);
    const onePasswordValue = onePasswordSecrets[key];
    if (onePasswordValue === undefined) {
      diffContent += kleur.red(`- [.env only] ${key}=${formatValue(value)}\n`);
    } else if (value !== onePasswordValue) {
      diffContent += kleur.red(`- [.env] ${key}=${formatValue(value)}\n`);
      diffContent += kleur.green(`+ [1Password] ${key}=${formatValue(onePasswordValue)}\n`);
    }
  }

  // Process keys from 1Password that are not in .env
  for (const [key, value] of Object.entries(onePasswordSecrets)) {
    if (!processedKeys.has(key)) {
      diffContent += kleur.green(`+ [1Password only] ${key}=${formatValue(value)}\n`);
    }
  }

  if (diffContent) {
    console.log('Differences found:');
    console.log(diffContent);
  } else {
    console.log('No differences found between .env and 1Password secrets.');
  }
}

function formatValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.includes('\n')) {
    return `"${value.replace(/\n/g, '\\n')}"`;
  } else if (value.startsWith('{') && value.endsWith('}')) {
    return `'${value}'`;
  } else if (value.includes(' ') || value.includes('"') || value.includes("'")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

module.exports = {
  syncEnvToOnePassword,
  syncOnePasswordToEnv,
  showDifferences,
};