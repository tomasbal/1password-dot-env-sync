import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

async function checkEnvFile(envFile: string): Promise<boolean> {
  const envPath = path.join(process.cwd(), envFile);
  try {
    await fs.access(envPath);
    return true;
  } catch (error) {
    return false;
  }
}

async function parseEnvSecrets(envFile: string): Promise<Record<string, string>> {
  const envPath = path.join(process.cwd(), envFile);
  const envContent = await fs.readFile(envPath, 'utf-8');
  return dotenv.parse(envContent);
}

async function listEnvFiles(): Promise<string[]> {
  const files = await fs.readdir(process.cwd());
  return files.filter(file => file.endsWith('.env') || file.match(/\..*\.env$/));
}

export {
  checkEnvFile,
  parseEnvSecrets,
  listEnvFiles,
};