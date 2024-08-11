import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Checks if a specified environment file exists in the current working directory.
 *
 * @param {string} envFile - The name of the environment file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 */
async function checkEnvFile(envFile: string): Promise<boolean> {
  const envPath = path.join(process.cwd(), envFile);
  try {
    await fs.access(envPath);
    return true;
  } catch (error) {
    // If fs.access throws an error, the file doesn't exist
    return false;
  }
}

/**
 * Parses the contents of a specified environment file and returns its secrets as key-value pairs.
 *
 * @param {string} envFile - The name of the environment file to parse.
 * @returns {Promise<Record<string, string>>} A promise that resolves to an object containing the parsed environment variables.
 * @throws {Error} If the file cannot be read or parsed.
 */
async function parseEnvSecrets(envFile: string): Promise<Record<string, string>> {
  const envPath = path.join(process.cwd(), envFile);
  const envContent = await fs.readFile(envPath, 'utf-8');
  return dotenv.parse(envContent);
}

/**
 * Lists all environment files in the current working directory.
 * Environment files are identified by the '.env' extension or by matching the pattern '.*\.env'.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of environment file names.
 */
async function listEnvFiles(): Promise<string[]> {
  const files = await fs.readdir(process.cwd());
  return files.filter(file => file.endsWith('.env') || file.match(/\..*\.env$/));
}

export {
  checkEnvFile,
  parseEnvSecrets,
  listEnvFiles,
};