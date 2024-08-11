import { Command } from 'commander';
import { parseEnvSecrets, listEnvFiles } from './envManager';
import { selectVault, initializeOnePassword } from './onePasswordManager';
import { syncEnvToOnePassword, syncOnePasswordToEnv, showDifferences } from './syncManager';
import { askSyncDirection, selectEnvFile } from './utils';
import { generateConfigTemplate } from './configManager';
import { logger } from './logger';

/**
 * Interface defining the structure of program options
 */
interface ProgramOptions {
    env: string;
    opToken?: string;
}

/**
 * Main function to set up and run the CLI application
 */
async function main() {
    const program = new Command();

    // Set up the main program
    program
        .version('1.0.0')
        .description('Sync secrets between .env and 1Password vault')
        .option('-e, --env <environment>', 'Specify the environment (e.g., local, dev, prod)', 'default')
        .option('--op-token <token>', '1Password access token');

    // 'init' command
    program
        .command('init')
        .description('Generate a template op-sync.yaml file')
        .action(generateConfigTemplate);

    // 'sync' command
    program
        .command('sync')
        .description('Sync secrets between .env and 1Password')
        .action(async (options: ProgramOptions) => {
            try {
                // Select .env file
                const availableEnvFiles = await listEnvFiles();
                const selectedEnvFile = await selectEnvFile(availableEnvFiles);

                // Initialize 1Password client
                logger.info('Initializing 1Password SDK...');
                const client = await initializeOnePassword(program.opts());

                // Select 1Password vault
                logger.info('Selecting vault...');
                const vault = await selectVault(client);

                // Determine sync direction
                const direction = await askSyncDirection();

                if (direction === 'env-to-1password') {
                    // Sync from .env to 1Password
                    logger.info('Syncing from .env to 1Password...');
                    const secrets = await parseEnvSecrets(selectedEnvFile);
                    await syncEnvToOnePassword(client, vault, secrets, selectedEnvFile);
                } else {
                    // Sync from 1Password to .env
                    logger.info('Syncing from 1Password to .env...');
                    await syncOnePasswordToEnv(client, vault, selectedEnvFile);
                }
            } catch (error) {
                logger.error(`An error occurred: ${(error as Error).message}`);
            }
        });

    // 'diff' command
    program
        .command('diff')
        .description('Show differences between .env and 1Password secrets')
        .action(async (options: ProgramOptions) => {
            try {
                // Select .env file
                const availableEnvFiles = await listEnvFiles();
                const selectedEnvFile = await selectEnvFile(availableEnvFiles);

                // Parse .env secrets
                logger.info('Parsing .env secrets...');
                const secrets = await parseEnvSecrets(selectedEnvFile);

                // Initialize 1Password client
                logger.info('Initializing 1Password SDK...');
                const client = await initializeOnePassword(program.opts());

                // Select 1Password vault
                logger.info('Selecting vault...');
                const vault = await selectVault(client);

                // Show differences
                logger.info('Showing differences...');
                await showDifferences(client, vault, secrets, selectedEnvFile);
            } catch (error) {
                logger.error(`An error occurred: ${(error as Error).message}`);
            }
        });

    // Parse command line arguments
    await program.parseAsync(process.argv);
}

export { main };