import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { select, input } from "@inquirer/prompts";
import { logger } from './logger';

const CONFIG_FILE_NAME = '1pass.yaml';

interface Config {
  token: string;
  storageMode: 'separate' | 'combined';
  projectPrefix: string;
  [key: string]: any;  // Allow for additional properties
}

async function loadConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    const fileContents = await fs.readFile(configPath, 'utf8');
    const config = yaml.load(fileContents) as Config;

    // Validate the configuration
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid ${CONFIG_FILE_NAME}: Configuration must be a YAML object`);
    }

    if (!config.token) {
      throw new Error(`Invalid ${CONFIG_FILE_NAME}: 'token' is missing`);
    }

    if (typeof config.token !== 'string' || config.token.trim() === '') {
      throw new Error(`Invalid ${CONFIG_FILE_NAME}: 'token' must be a non-empty string`);
    }

    if (config.token === '<replace_me_with_token>') {
      throw new Error(`${CONFIG_FILE_NAME}: Please replace the placeholder token with your actual 1Password service account token`);
    }

    if (!config.storageMode || (config.storageMode !== 'separate' && config.storageMode !== 'combined')) {
      config.storageMode = 'separate';  // Default to 'separate' if not set or invalid
    }

    if (!config.projectPrefix) {
      config.projectPrefix = '';  // Default to empty string if not set
    }

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${CONFIG_FILE_NAME} not found. Run 'init' command to create it.`);
    }
    throw error;
  }
}

async function generateConfigTemplate(): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);

  logger.info(`Checking for config file at: ${configPath}`);

  try {
    await fs.access(configPath);
    logger.info('File exists, checking contents...');

    const fileContents = await fs.readFile(configPath, 'utf8');
    logger.info('File contents:');
    console.log(fileContents);
    const existingConfig = yaml.load(fileContents) as Config;
    logger.info('Parsed config:');
    console.log(existingConfig);

    if (existingConfig && existingConfig.token) {
      logger.success('Valid configuration found.');
      const answer = await select({
        message: `${CONFIG_FILE_NAME} already exists and appears to be valid. What would you like to do?`,
        choices: [
          { value: 'keep', name: 'Keep existing file' },
          { value: 'override', name: 'Override with new template' },
        ],
      });

      if (answer === 'keep') {
        logger.info(`Keeping existing ${CONFIG_FILE_NAME} file.`);
        return;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.warning(`No existing ${CONFIG_FILE_NAME} file found. Creating a new one.`);
    } else {
      logger.error(`Error checking file: ${(error as Error).message}`);
    }
  }

  logger.info('\nYou can provide the 1Password service account token now or leave it empty and fill it in later.');
  logger.info('If left empty, a placeholder value will be used in the file.');

  const token = await input({
    message: 'Enter your 1Password service account token (or leave empty):',
  });

  const storageMode = await select({
    message: 'Choose the default storage mode for secrets:',
    choices: [
      { value: 'separate', name: 'As separate items for each secret' },
      { value: 'combined', name: 'As one item with fields for all secrets' },
    ],
  }) as 'separate' | 'combined';

  const projectPrefix = await input({
    message: 'Enter a project prefix for 1Password items (or leave empty):',
  });

  const template = `# 1Password configuration
token: ${token || '<replace_me_with_token>'}
storageMode: ${storageMode}
projectPrefix: ${projectPrefix || ''}
`;

  try {
    await fs.writeFile(configPath, template);
    logger.success(`\n${CONFIG_FILE_NAME} has been created at ${configPath}`);
    if (!token) {
      logger.warning('Please edit this file to add your 1Password service account token before using the tool.');
    }
  } catch (error) {
    logger.error(`Failed to create ${CONFIG_FILE_NAME}: ${(error as Error).message}`);
  }
}

async function updateConfig(updates: Partial<Config>): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    const currentConfig = await loadConfig();
    const updatedConfig = { ...currentConfig, ...updates };
    await fs.writeFile(configPath, yaml.dump(updatedConfig));
    logger.success(`${CONFIG_FILE_NAME} has been updated.`);
  } catch (error) {
    logger.error(`Failed to update ${CONFIG_FILE_NAME}: ${(error as Error).message}`);
  }
}

export { loadConfig, generateConfigTemplate, updateConfig, Config };