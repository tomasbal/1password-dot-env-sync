import { select, input } from "@inquirer/prompts";
import { Config, updateConfig } from "./configManager";

/**
 * Defines the possible directions for synchronization.
 */
type SyncDirection = 'env-to-1password' | '1password-to-env';

/**
 * Prompts the user to select the direction of synchronization.
 *
 * @returns {Promise<SyncDirection>} The selected sync direction
 */
async function askSyncDirection(): Promise<SyncDirection> {
  return select({
    message: 'Select sync direction:',
    choices: [
      { name: '.env to 1Password', value: 'env-to-1password' },
      { name: '1Password to .env', value: '1password-to-env' },
    ],
  });
}

/**
 * Prompts the user to enter a project prefix for 1Password items.
 *
 * @returns {Promise<string>} The entered project prefix
 */
async function promptForProjectPrefix(): Promise<string> {
  return input({
    message: 'Enter a project prefix for 1Password items:',
    validate: (value: string) =>
        value.trim() !== '' || 'Project prefix cannot be empty',
  });
}

/**
 * Prompts the user to select an .env file from the available options.
 * If only one file is available, it's automatically selected.
 *
 * @param {string[]} availableEnvFiles - Array of available .env file names
 * @returns {Promise<string>} The selected .env file name
 * @throws {Error} If no .env files are found in the current directory
 */
async function selectEnvFile(availableEnvFiles: string[]): Promise<string> {
  if (availableEnvFiles.length === 0) {
    throw new Error('No .env files found in the current directory.');
  }

  if (availableEnvFiles.length === 1) {
    return availableEnvFiles[0];
  }

  return select({
    message: 'Select the .env file to sync:',
    choices: availableEnvFiles.map(file => ({ value: file, name: file })),
  });
}

/**
 * Manages the storage mode selection process, allowing the user to change
 * the current mode and optionally save it as the new default.
 *
 * @param {Config} config - The current configuration object
 * @returns {Promise<'separate' | 'combined'>} The selected storage mode
 */
async function getStorageMode(config: Config): Promise<'separate' | 'combined'> {
  // Ask if the user wants to change the current storage mode
  const changeMode = await select({
    message: `Current storage mode is '${config.storageMode}'. Do you want to change it for this operation?`,
    choices: [
      { value: 'keep', name: 'Keep current mode' },
      { value: 'change', name: 'Change mode' },
    ],
  });

  if (changeMode === 'change') {
    // Prompt for new storage mode
    const newMode = await select({
      message: 'Choose the storage mode for secrets:',
      choices: [
        { value: 'separate', name: 'As separate items for each secret' },
        { value: 'combined', name: 'As one item with fields for all secrets' },
      ],
    }) as 'separate' | 'combined';

    // Ask if the new mode should be saved as default
    const saveChoice = await select({
      message: 'Do you want to save this choice as the new default?',
      choices: [
        { value: 'yes', name: 'Yes, save as new default' },
        { value: 'no', name: 'No, use only for this operation' },
      ],
    });

    if (saveChoice === 'yes') {
      await updateConfig({ storageMode: newMode });
    }

    return newMode;
  }

  // If no change, return the current storage mode
  return config.storageMode;
}

export {
  askSyncDirection,
  promptForProjectPrefix,
  selectEnvFile,
  getStorageMode
};