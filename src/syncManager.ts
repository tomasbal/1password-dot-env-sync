import fs from 'fs/promises';
import {
  Client,
  ItemCategory,
  ItemCreateParams,
  ItemField,
  ItemFieldType,
  ItemOverview,
  VaultOverview
} from "@1password/sdk";
import path from 'path';
import kleur from 'kleur';
import { logger } from './logger';
import { loadConfig, updateConfig, Config } from './configManager';
import { getStorageMode } from "./utils";
import { input } from "@inquirer/prompts";

/**
 * Ensures that a project prefix is set in the configuration.
 * If not set, prompts the user to enter one.
 *
 * @returns {Promise<string>} The project prefix
 */
async function ensureProjectPrefix(): Promise<string> {
  const config = await loadConfig();
  if (!config.projectPrefix) {
    const projectPrefix = await input({
      message: 'Enter a project prefix for 1Password items:',
      validate: (value) => value.trim() !== '' || 'Project prefix cannot be empty',
    });
    await updateConfig({ projectPrefix });
    return projectPrefix;
  }
  return config.projectPrefix;
}

/**
 * Synchronizes secrets from .env file to 1Password.
 *
 * @param {Client} client - 1Password client
 * @param {VaultOverview} vault - Selected vault
 * @param {Record<string, string>} secrets - Secrets from .env file
 * @param {string} selectedEnvFile - Name of the selected .env file
 */
async function syncEnvToOnePassword(client: Client, vault: VaultOverview, secrets: Record<string, string>): Promise<void> {
  const config = await loadConfig();
  const mode = await getStorageMode(config);
  const projectPrefix = await ensureProjectPrefix();

  if (mode === 'separate') {
    await syncAsSeparateItems(client, vault, secrets);
  } else if (mode === 'combined') {
    await syncAsCombinedItem(client, vault, secrets, projectPrefix);
  }
}

/**
 * Synchronizes secrets as separate items in 1Password.
 *
 * @param {Client} client - 1Password client
 * @param {VaultOverview} vault - Selected vault
 * @param {Record<string, string>} secrets - Secrets to sync
 */
async function syncAsSeparateItems(client: Client, vault: VaultOverview, secrets: Record<string, string>): Promise<void> {
  const items = await client.items.listAll(vault.id);
  let updatedSecrets: string[] = [];
  let createdSecrets: string[] = [];

  for (const [key, value] of Object.entries(secrets)) {
    try {
      let existingItem: ItemOverview | undefined;
      for await (const item of items) {
        if (item.title === key) {
          existingItem = item;
          break;
        }
      }

      if (existingItem) {
        let itemToUpdate = await client.items.get(existingItem.vaultId, existingItem.id);
        if (itemToUpdate.fields && itemToUpdate.fields.length > 0 && itemToUpdate.fields[0].value !== String(value)) {
          itemToUpdate.fields[0].value = String(value);
          await client.items.put(itemToUpdate);
          updatedSecrets.push(key);
        }
      } else {
        await client.items.create({
          title: key,
          category: ItemCategory.Password,
          vaultId: vault.id,
          fields: [
            {
              id: 'password',
              title: 'password',
              fieldType: ItemFieldType.Concealed,
              value: value,
            },
          ],
          sections: [],
        });
        createdSecrets.push(key);
      }
    } catch (error) {
      logger.error(`Failed to sync secret '${key}': ${(error as Error).message}`);
    }
  }

  // Log results
  if (updatedSecrets.length > 0 || createdSecrets.length > 0) {
    logger.info('Secrets synced in 1Password:');
    if (updatedSecrets.length > 0) {
      logger.info(`Updated ${updatedSecrets.length} secret(s): ${updatedSecrets.join(', ')}`);
    }
    if (createdSecrets.length > 0) {
      logger.info(`Created ${createdSecrets.length} new secret(s): ${createdSecrets.join(', ')}`);
    }
  } else {
    logger.info('No changes detected, exiting...');
  }
}

/**
 * Synchronizes secrets as a combined item in 1Password.
 *
 * @param {Client} client - 1Password client
 * @param {VaultOverview} vault - Selected vault
 * @param {Record<string, string>} secrets - Secrets to sync
 * @param {string} projectPrefix - Project prefix for the combined item
 */
async function syncAsCombinedItem(client: Client, vault: VaultOverview, secrets: Record<string, string>, projectPrefix: string): Promise<void> {
  const items = await client.items.listAll(vault.id);

  let fields: ItemField[] = [];
  let updatedSecrets: string[] = [];
  let createdSecrets: string[] = [];

  // Prepare fields
  if (Object.entries(secrets).length > 0) {
    for (const [key, value] of Object.entries(secrets)) {
      fields.push({
        id: `field_${key}`,
        title: key,
        fieldType: ItemFieldType.Concealed,
        value: value,
        sectionId: projectPrefix
      });
    }
  }

  try {
    let existingItem: ItemOverview | undefined;
    for await (const item of items) {
      if (item.title === projectPrefix) {
        existingItem = item;
        break;
      }
    }

    if (existingItem) {
      // Update existing item
      let itemToUpdate = await client.items.get(existingItem.vaultId, existingItem.id);
      const existingFields = itemToUpdate.fields || [];

      for (const newField of fields) {
        const existingField = existingFields.find(f => f.title === newField.title);
        if (existingField) {
          if (existingField.value !== newField.value) {
            updatedSecrets.push(newField.title);
          }
        } else {
          createdSecrets.push(newField.title);
        }
      }

      if (updatedSecrets.length > 0 || createdSecrets.length > 0) {
        itemToUpdate.fields = fields;
        await client.items.put(itemToUpdate);

        logger.info('Secrets synced in 1Password:');
        if (updatedSecrets.length > 0) {
          logger.info(`Updated ${updatedSecrets.length} secret(s): ${updatedSecrets.join(', ')}`);
        }
        if (createdSecrets.length > 0) {
          logger.info(`Created ${createdSecrets.length} new secret(s): ${createdSecrets.join(', ')}`);
        }
      } else {
        logger.info('No changes detected, exiting...');
      }
    } else {
      // Create new item
      const objectToCreate: ItemCreateParams = {
        title: projectPrefix,
        category: ItemCategory.Password,
        vaultId: vault.id,
        fields: fields,
        sections: [{
          id: projectPrefix,
          title: "Env secrets",
        }],
      };
      await client.items.create(objectToCreate);
      createdSecrets = fields.map(f => f.title);
      logger.success(`New item created in 1Password with ${createdSecrets.length} secret(s):`);
      logger.info(`${createdSecrets.join(', \n')}`);
    }
  } catch (error) {
    throw new Error(`Failed to sync secrets: ${(error as Error).message}`);
  }
}

/**
 * Synchronizes secrets from 1Password to .env file.
 *
 * @param {Client} client - 1Password client
 * @param {VaultOverview} vault - Selected vault
 * @param {string} selectedEnvFile - Name of the selected .env file
 */
async function syncOnePasswordToEnv(client: Client, vault: VaultOverview, selectedEnvFile: string): Promise<void> {
  const config = await loadConfig();
  const mode = await getStorageMode(config);
  const projectPrefix = await ensureProjectPrefix();
  const items = await client.items.listAll(vault.id);
  const onePasswordSecrets: Record<string, string> = {};

  // Fetch secrets from 1Password based on storage mode
  if (mode === 'separate') {
    for await (const item of items) {
      if (item.category === ItemCategory.Password) {
        const fullItem = await client.items.get(item.vaultId, item.id);
        const passwordField = fullItem.fields?.find(field => field.id === 'password');
        if (passwordField && passwordField.value.trim() !== '') {
          onePasswordSecrets[item.title] = passwordField.value;
        }
      }
    }
  } else if (mode === 'combined') {
    const combinedItem = await (async () => {
      for await (const item of items) {
        if (item.title === projectPrefix) return item;
      }
    })();
    if (combinedItem) {
      const fullItem = await client.items.get(combinedItem.vaultId, combinedItem.id);
      fullItem.fields?.forEach(field => {
        if (field.value.trim() !== '') {
          onePasswordSecrets[field.title] = field.value;
        }
      });
    }
  }

  // Read and process .env file
  const envPath = path.join(process.cwd(), selectedEnvFile);
  const envContent = await fs.readFile(envPath, 'utf8');
  const envLines = envContent.split('\n');

  let updatedSecrets: string[] = [];
  let addedSecrets: string[] = [];
  const processedKeys = new Set<string>();

  const updatedEnvLines: string[] = [];
  let i = 0;
  while (i < envLines.length) {
    let line = envLines[i].trimEnd();  // Trim end to remove trailing spaces but keep indentation
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)/);

    if (match) {
      const [, key, oldValue] = match;
      if (onePasswordSecrets.hasOwnProperty(key)) {
        processedKeys.add(key);
        const newValue = formatValue(onePasswordSecrets[key]);

        if (oldValue.trim() !== newValue.trim()) {
          updatedSecrets.push(key);
          // Preserve the original indentation
          const indentation = line.match(/^\s*/)?.[0] || '';
          updatedEnvLines.push(`${indentation}${key}=${newValue}`);
        } else {
          updatedEnvLines.push(line);
        }

        // Handle multiline values
        if (newValue.includes('\n')) {
          i++;
          while (i < envLines.length && !envLines[i].match(/^[a-zA-Z_][a-zA-Z0-9_]*=/)) {
            i++;
          }
          i--; // Adjust for the outer loop increment
        }
      } else {
        updatedEnvLines.push(line);
      }
    } else {
      // This line is not a key-value pair, keep it (comment or blank line)
      updatedEnvLines.push(line);
    }
    i++;
  }

  // Add new keys from 1Password that are not in .env
  for (const [key, value] of Object.entries(onePasswordSecrets)) {
    if (!processedKeys.has(key)) {
      if (updatedEnvLines[updatedEnvLines.length - 1] !== '') {
        updatedEnvLines.push('');
      }
      updatedEnvLines.push(`${key}=${formatValue(value)}`);
      addedSecrets.push(key);
    }
  }

  // Write updated content back to file
  await fs.writeFile(envPath, updatedEnvLines.join('\n') + '\n');

  // Log results
  if (updatedSecrets.length > 0 || addedSecrets.length > 0) {
    logger.info('Secrets synced from 1Password to .env:');
    if (updatedSecrets.length > 0) {
      logger.info(`Updated ${updatedSecrets.length} secret(s): ${updatedSecrets.join(', ')}`);
    }
    if (addedSecrets.length > 0) {
      logger.info(`Added ${addedSecrets.length} new secret(s): ${addedSecrets.join(', ')}`);
    }
  } else {
    logger.info('No changes detected, .env file is up to date.');
  }

  logger.success(`Sync from 1Password to ${selectedEnvFile} completed.`);
}

/**
 * Shows differences between .env file and 1Password secrets.
 *
 * @param {Client} client - 1Password client
 * @param {VaultOverview} vault - Selected vault
 * @param {Record<string, string>} envSecrets - Secrets from .env file
 * @param {string} selectedEnvFile - Name of the selected .env file
 */
async function showDifferences(client: Client, vault: VaultOverview, envSecrets: Record<string, string>): Promise<void> {
  const config = await loadConfig();
  const mode = await getStorageMode(config);
  const projectPrefix = await ensureProjectPrefix();
  const items = await client.items.listAll(vault.id);
  const onePasswordSecrets: Record<string, string> = {};

  // Fetch secrets from 1Password based on storage mode
  if (mode === 'separate') {
    for await (const item of items) {
      if (item.category === ItemCategory.Password) {
        const fullItem = await client.items.get(item.vaultId, item.id);
        const passwordField = fullItem.fields?.find(field => field.id === 'password');
        if (passwordField) {
          onePasswordSecrets[item.title] = passwordField.value;
        }
      }
    }
  } else if (mode === 'combined') {
    const combinedItem = await (async () => {
      for await (const item of items) {
        if (item.title === projectPrefix) return item;
      }
    })();
    if (combinedItem) {
      const fullItem = await client.items.get(combinedItem.vaultId, combinedItem.id);
      fullItem.fields?.forEach(field => {
        onePasswordSecrets[field.title] = field.value;
      });
    }
  }

  let diffContent = '';
  const processedKeys = new Set<string>();

  // Process keys from .env file
  for (const [key, value] of Object.entries(envSecrets)) {
    processedKeys.add(key);
    const onePasswordValue = onePasswordSecrets[key];
    if (onePasswordValue === undefined) {
      diffContent += kleur.red(`- [.env only]  ${key}=${formatValue(value)}\n`);
    } else if (value !== onePasswordValue) {
      diffContent += kleur.red(`- [.env]  ${key}=${formatValue(value)}\n`);
      diffContent += kleur.green(`+ [1pass] ${key}=${formatValue(onePasswordValue)}\n`);
    }
  }

  // Process keys from 1Password that are not in .env
  for (const [key, value] of Object.entries(onePasswordSecrets)) {
    if (!processedKeys.has(key)) {
      diffContent += kleur.green(`+ [1pass only] ${key}=${formatValue(value)}\n`);
    }
  }

  // Display differences or inform if no differences found
  if (diffContent) {
    logger.info('Differences found:');
    console.log(diffContent); // Keeping this as console.log for better formatting
  } else {
    logger.info('No differences found between .env and 1Password secrets.');
  }
}

/**
 * Formats the value of a secret for display or storage.
 * Handles multiline values, JSON-like strings, and values with spaces or quotes.
 *
 * @param {string} value - The value to format
 * @returns {string} The formatted value
 */
function formatValue(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.includes('\n')) {
    return `"${value.replace(/\n/g, '\\n')}"`; //TODO: Add better handling for multiline values.
  } else if (value.startsWith('{') && value.endsWith('}')) {
    return `'${value}'`;
  } else if (value.includes(' ') || value.includes('"') || value.includes("'")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export {
  syncEnvToOnePassword,
  syncOnePasswordToEnv,
  showDifferences,
};