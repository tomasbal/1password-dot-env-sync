import kleur from 'kleur';

/**
 * Logger utility for consistent, color-coded console output.
 * Uses the kleur library for ANSI color and style support.
 */
export const logger = {
    /**
     * Log an informational message in blue.
     * @param {string} message - The message to log.
     */
    info: (message: string) => console.log(kleur.blue(message)),

    /**
     * Log a success message in bold green.
     * @param {string} message - The message to log.
     */
    success: (message: string) => console.log(kleur.green().bold(message)),

    /**
     * Log a warning message in yellow.
     * @param {string} message - The message to log.
     */
    warning: (message: string) => console.log(kleur.yellow(message)),

    /**
     * Log an error message in bold red.
     * @param {string} message - The message to log.
     */
    error: (message: string) => console.error(kleur.red().bold(message)),
};