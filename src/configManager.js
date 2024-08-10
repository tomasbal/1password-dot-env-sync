const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const inquirer = require('inquirer').default;

const CONFIG_FILE_NAME = '1pass.yaml';

async function loadConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    const fileContents = await fs.readFile(configPath, 'utf8');
    const config = yaml.load(fileContents);

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

    // Check if the token is still the placeholder value
    if (config.token === '<replace_me_with_token>') {
      throw new Error(`${CONFIG_FILE_NAME}: Please replace the placeholder token with your actual 1Password service account token`);
    }

    // You can add more specific validation here if needed
    // For example, checking the token's format or length

    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${CONFIG_FILE_NAME} not found. Run 'init' command to create it.`);
    }
    throw error;
  }
}

async function generateConfigTemplate() {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  
  console.log(`Checking for config file at: ${configPath}`);

  try {
    await fs.access(configPath);
    console.log('File exists, checking contents...');
    
    const fileContents = await fs.readFile(configPath, 'utf8');
    console.log('File contents:', fileContents);
    const existingConfig = yaml.load(fileContents);
    console.log('Parsed config:', existingConfig);
    
    if (existingConfig && existingConfig.token) {
      console.log('Valid configuration found.');
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: `${CONFIG_FILE_NAME} already exists and appears to be valid. What would you like to do?`,
          choices: [
            { name: 'Keep existing file', value: 'keep' },
            { name: 'Override with new template', value: 'override' },
          ],
        },
      ]);
      
      if (action === 'keep') {
        console.log(`Keeping existing ${CONFIG_FILE_NAME} file.`);
        return;
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`No existing ${CONFIG_FILE_NAME} file found. Creating a new one.`);
    } else {
      console.error('Error checking file:', error);
    }
  }

  console.log('\nYou can provide the 1Password service account token now or leave it empty and fill it in later.');
  console.log('If left empty, a placeholder value will be used in the file.');

  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'Enter your 1Password service account token (or leave empty):',
    },
  ]);

  const template = `# 1Password configuration
token: ${token || '<replace_me_with_token>'}
`;

  try {
    await fs.writeFile(configPath, template);
    console.log(`\n${CONFIG_FILE_NAME} has been created at ${configPath}`);
    if (!token) {
      console.log('Please edit this file to add your 1Password service account token before using the tool.');
    }
  } catch (error) {
    console.error(`Failed to create ${CONFIG_FILE_NAME}:`, error.message);
  }
}

module.exports =  { loadConfig, generateConfigTemplate };