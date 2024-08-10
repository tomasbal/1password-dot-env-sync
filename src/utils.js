const inquirer = require('inquirer').default;

async function askSyncDirection() {
  const { direction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'direction',
      message: 'Select sync direction:',
      choices: [
        { name: '.env to 1Password', value: 'env-to-1password' },
        { name: '1Password to .env', value: '1password-to-env' },
      ],
    },
  ]);

  return direction;
}

module.exports = {
  askSyncDirection,
};