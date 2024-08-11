import { Command } from 'commander';
import { parseEnvSecrets, listEnvFiles } from './envManager';
import { selectVault, initializeOnePassword } from './onePasswordManager';
import { syncEnvToOnePassword, syncOnePasswordToEnv, showDifferences } from './syncManager';
import { askSyncDirection, selectEnvFile } from './utils';
import { generateConfigTemplate } from './configManager';
import { logger } from './logger';

interface ProgramOptions {
    env: string;
    opToken?: string;
}

async function main() {
    const program = new Command();

    program
        .version('1.0.0')
        .description('Sync secrets between .env and 1Password vault')
        .option('-e, --env <environment>', 'Specify the environment (e.g., local, dev, prod)', 'default')
        .option('--op-token <token>', '1Password access token');

    program
        .command('init')
        .description('Generate a template op-sync.yaml file')
        .action(generateConfigTemplate);

    program
        .command('sync')
        .description('Sync secrets between .env and 1Password')
        .action(async (options: ProgramOptions) => {
            try {
                const availableEnvFiles = await listEnvFiles();
                const selectedEnvFile = await selectEnvFile(availableEnvFiles);

                logger.info('Initializing 1Password SDK...');
                const client = await initializeOnePassword(program.opts());

                logger.info('Selecting vault...');
                const vault = await selectVault(client);

                const direction = await askSyncDirection();

                if (direction === 'env-to-1password') {
                    logger.info('Syncing from .env to 1Password...');
                    const secrets = await parseEnvSecrets(selectedEnvFile);
                    await syncEnvToOnePassword(client, vault, secrets, selectedEnvFile);
                } else {
                    logger.info('Syncing from 1Password to .env...');
                    await syncOnePasswordToEnv(client, vault, selectedEnvFile);
                }
            } catch (error) {
                logger.error(`An error occurred: ${(error as Error).message}`);
            }
        });

    program
        .command('diff')
        .description('Show differences between .env and 1Password secrets')
        .action(async (options: ProgramOptions) => {
            try {
                const availableEnvFiles = await listEnvFiles();
                const selectedEnvFile = await selectEnvFile(availableEnvFiles);

                logger.info('Parsing .env secrets...');
                const secrets = await parseEnvSecrets(selectedEnvFile);

                logger.info('Initializing 1Password SDK...');
                const client = await initializeOnePassword(program.opts());

                logger.info('Selecting vault...');
                const vault = await selectVault(client);

                logger.info('Showing differences...');
                await showDifferences(client, vault, secrets, selectedEnvFile);
            } catch (error) {
                logger.error(`An error occurred: ${(error as Error).message}`);
            }
        });

    await program.parseAsync(process.argv);
}

export { main };