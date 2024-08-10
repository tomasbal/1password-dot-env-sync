const {program} = require('commander');
const {checkEnvFile, parseEnvSecrets} = require('./envManager');
const {selectVault, initializeOnePassword} = require('./onePasswordManager');
const {syncEnvToOnePassword, syncOnePasswordToEnv, showDifferences} = require('./syncManager');
const {askSyncDirection} = require('./utils');
const {generateConfigTemplate} = require('./configManager');
const inquirer = require('inquirer').default;


async function main() {
    program
        .version('1.0.0')
        .description('Sync secrets between .env and 1Password vault')
        .option('--op-token <token>', '1Password access token')

    program
        .command('init')
        .description('Generate a template 1pass.yaml file')
        .action(generateConfigTemplate);

    program
        .command('sync')
        .description('Sync secrets between .env and 1Password')
        .action(async () => {
            try {
                // Check if .env file exists and parse secrets
                const envExists = await checkEnvFile();
                if (!envExists) {
                    console.log('.env file not found. Please create one and try again.');
                    return;
                }
                const secrets = await parseEnvSecrets();

                // Initialize 1Password SDK
                console.log('Initializing 1Password SDK...');
                const client = await initializeOnePassword(program.opts());
                console.log('1Password SDK initialized:', client);

                // Select vault
                console.log('Selecting vault...');
                const vault = await selectVault(client);
                console.log('Selected vault:', vault);

                // Ask for sync direction
                const direction = await askSyncDirection();

                // Add confirmation step
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to sync ${direction === 'env-to-1password' ? '.env to 1Password' : '1Password to .env'}? This may overwrite existing data.`,
                        default: false,
                    },
                ]);

                if (!confirm) {
                    console.log('Sync operation cancelled.');
                    return;
                }

                if (direction === 'env-to-1password') {
                    await syncEnvToOnePassword(client, vault, secrets);
                } else {
                    await syncOnePasswordToEnv(client, vault);
                }

                console.log('Sync completed successfully!');
            } catch (error) {
                console.error('An error occurred:', error.message);
                console.error('Stack trace:', error.stack);
            }
        });

    program
        .command('diff')
        .description('Show differences between .env and 1Password secrets')
        .action(async () => {
            try {
                const envExists = await checkEnvFile();
                if (!envExists) {
                    console.log('.env file not found. Please create one and try again.');
                    return;
                }
                const secrets = await parseEnvSecrets();

                const client = await initializeOnePassword(program.opts());
                const vault = await selectVault(client);

                await showDifferences(client, vault, secrets);
            } catch (error) {
                console.error('An error occurred:', error.message);
            }
        });

    program.parse(process.argv);
}

main();