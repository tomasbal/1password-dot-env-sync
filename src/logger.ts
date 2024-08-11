import kleur from 'kleur';

export const logger = {
    info: (message: string) => console.log(kleur.blue(message)),
    success: (message: string) => console.log(kleur.green().bold(message)),
    warning: (message: string) => console.log(kleur.yellow(message)),
    error: (message: string) => console.error(kleur.red().bold(message)),
};