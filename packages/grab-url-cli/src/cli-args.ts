#!/usr/bin/env node
/**
 * @file arg-parser.ts
 * @description Minimal CLI argument parser for grab-url bin, plus URL type detection.
 */

/** Minimal yargs-style arg parser used by the grab-url CLI */
export class ArgParser {
    commands: Record<string, { desc: string; handler?: any; required: boolean }> = {};
    options: Record<string, any> = {};
    examples: Array<{ cmd: string; desc: string }> = [];
    helpText = '';
    versionText = '1.0.0';

    usage(text: string) { this.helpText = text; return this; }

    command(pattern: string, desc: string, handler?: any) {
        const match = pattern.match(/\$0 <(\w+)>/);
        if (match) this.commands[match[1]] = { desc, handler, required: true };
        return this;
    }

    option(name: string, opts: any = {}) { this.options[name] = opts; return this; }
    example(cmd: string, desc: string) { this.examples.push({ cmd, desc }); return this; }
    help() { return this; }
    alias(short: string, long: string) { if (this.options[long]) this.options[long].alias = short; return this; }
    version(v: string) { if (v) this.versionText = v; return this; }
    strict() { return this; }

    parseSync() {
        const args = process.argv.slice(2);
        const result: Record<string, any> = {};
        const positional: string[] = [];

        if (args.includes('--help') || args.includes('-h')) { this.showHelp(); process.exit(0); }
        if (args.includes('--version')) { console.log(this.versionText); process.exit(0); }

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const [key, value] = arg.split('=');
                const optName = key.slice(2);
                if (value !== undefined) {
                    result[optName] = this.coerceValue(optName, value);
                } else if (this.options[optName]?.type === 'boolean') {
                    result[optName] = true;
                } else {
                    const nextArg = args[i + 1];
                    if (nextArg && !nextArg.startsWith('-')) {
                        result[optName] = this.coerceValue(optName, nextArg);
                        i++;
                    } else {
                        result[optName] = true;
                    }
                }
            } else if (arg.startsWith('-') && arg.length === 2) {
                const shortFlag = arg[1];
                const longName = this.findLongName(shortFlag);
                if (longName) {
                    if (this.options[longName]?.type === 'boolean') {
                        result[longName] = true;
                    } else {
                        const nextArg = args[i + 1];
                        if (nextArg && !nextArg.startsWith('-')) {
                            result[longName] = this.coerceValue(longName, nextArg);
                            i++;
                        }
                    }
                }
            } else {
                positional.push(arg);
            }
        }

        if (positional.length > 0) result.urls = positional;

        Object.keys(this.options).forEach(key => {
            if (result[key] === undefined && this.options[key].default !== undefined) {
                result[key] = this.options[key].default;
            }
        });

        if ((!result.urls || result.urls.length === 0) && this.commands.url?.required) {
            console.error('Error: Missing required argument: url');
            this.showHelp();
            process.exit(1);
        }

        return result;
    }

    coerceValue(optName: string, value: string) {
        const opt = this.options[optName];
        if (!opt) return value;
        if (opt.coerce) return opt.coerce(value);
        switch (opt.type) {
            case 'number': return Number(value);
            case 'boolean': return value === 'true' || value === '1';
            default: return value;
        }
    }

    findLongName(shortFlag: string) {
        return Object.keys(this.options).find(key => this.options[key].alias === shortFlag);
    }

    showHelp() {
        console.log(this.helpText || 'Usage: grab-url <url> [options]');
        console.log('\nPositional arguments:');
        Object.keys(this.commands).forEach(cmd => {
            console.log(`  ${cmd.padEnd(20)} ${this.commands[cmd].desc}`);
        });
        console.log('\nOptions:');
        Object.keys(this.options).forEach(key => {
            const opt = this.options[key];
            const flags = opt.alias ? `-${opt.alias}, --${key}` : `--${key}`;
            console.log(`  ${flags.padEnd(20)} ${opt.describe || ''}`);
        });
        if (this.examples.length > 0) {
            console.log('\nExamples:');
            this.examples.forEach(ex => {
                console.log(`  ${ex.cmd}`);
                console.log(`    ${ex.desc}`);
            });
        }
    }
}

/**
 * Detect whether a URL points to a file download (has a file extension).
 * @param url - The URL string to inspect
 */
export function isFileUrl(url: string): boolean {
    return /\.[a-zA-Z0-9]{1,5}(?:\.[a-zA-Z0-9]{1,5})*$/.test(url.split('?')[0]);
}
