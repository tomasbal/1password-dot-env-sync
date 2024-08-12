# 1Password-ENV Sync
[![npm version](https://badge.fury.io/js/1password-dot-env-sync.svg)](https://www.npmjs.com/package/1password-dot-env-sync)


## Overview

`1password-env-sync` is a command-line tool that synchronizes secrets between `.env` files and 1Password vaults. This tool allows you to keep your environment variables secure by leveraging 1Password's vault management and syncing capabilities.

## Features

- **Sync Secrets**: Easily sync your `.env` files with 1Password vaults, ensuring all secrets are stored securely.
- **1Password SDK Integration**: Utilizes the official 1Password SDK to interact with vaults.
- **CLI Commands**: Intuitive command-line interface for syncing and managing your secrets.
- **Modular Management**: Handles the configuration, environment, and 1Password interactions in a modular way.

## Roadmap

1. **Support for Multiple .env Files**:
    - Future releases will support syncing across multiple environment files (e.g., `local`, `prod`, `dev`).

2. **Support sub directory .env files**:
   -  Future releases will support the ability to sync .env files that are in subdirectories within the project root.

3**Vault Creation**:
    - When the 1Password SDK supports it, we will add the ability to create new vaults directly from the CLI.

4**Extended CLI Commands with Flags**:
    - We plan to extend the CLI with more commands and flags to enhance the flexibility and usability of the tool.


## Getting Started - Local Development

### Prerequisites

- Node.js (version >= 18.0.0)
- NPM or Yarn

### Installation

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/yourusername/1password-env-sync.git
cd 1password-env-sync
```

Install the dependencies:

```bash
npm install
```

### Local Development Setup

To start developing or modifying the tool locally, follow these steps:

1. **Build the Project**: Compile the TypeScript files.

   ```bash
   npm run build
   ```

2. **Watch for Changes**: Automatically rebuild the project when files change.

   ```bash
   npm run watch
   ```

3. **Start the Application**: Run the CLI tool.

   ```bash
   npm start
   ```

### Usage

To start using the tool and to sync your `.env` file with a 1Password vault, simply run the following command:
```bash
npx 1password-env-sync init
```
This will initiate the setup of the tool and prompt you to configure the 1Password service account connection (if you don't know how to create 1password token you can find the instructions on the following [Link](https://developer.1password.com/docs/service-accounts/get-started)).


After the setup is complete, you can sync your `.env` file with the 1Password vault by running:
```bash
npx 1password-env-sync sync
```

This will read the default `.env` file in the root directory and sync the variables with the specified 1Password vault configured in your setup.

### CLI Commands

- `sync`: Syncs the default `.env` file with the 1Password vault.
- `diff`: Compares secrets between the `.env` file and the 1Password vault.
- `help`: Displays help for a command.

### Configuration

The tool uses a configuration file to manage settings. By default, it looks for a `config.yaml` file in the root directory.

### Project Structure

- **src/**: Contains the TypeScript source files.
- **dist/**: Compiled JavaScript files.
- **envManager.ts**: Handles loading and parsing `.env` files.
- **onePasswordManager.ts**: Interfaces with the 1Password SDK.
- **syncManager.ts**: Coordinates the syncing process between `.env` files and 1Password vaults.
- **cli.ts**: Defines the command-line interface and commands.
- **configManager.ts**: Manages application configurations.
- **logger.ts**: Provides logging functionality across the application.
- **utils.ts**: Utility functions used throughout the application.


### How to contribute
This project is actively looking for maintainers, so feel free to reach out to me if you want to contribute to it.

E-mail: [contact@tomislavbalabanov.me](mailto:contact@tomislavbalabanov.me)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Tomislav Balabanov

---