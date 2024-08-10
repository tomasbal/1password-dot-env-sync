const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

async function checkEnvFile() {
  try {
    await fs.access(path.join(process.cwd(), '.env'));
    return true;
  } catch (error) {
    return false;
  }
}

async function parseEnvSecrets() {
  const envContent = await fs.readFile(path.join(process.cwd(), '.env'), 'utf-8');
  return dotenv.parse(envContent);
}

module.exports = {
  checkEnvFile,
  parseEnvSecrets,
};