#!/usr/bin/env node
/**
 * @file arg-parser.ts
 * @description Minimal CLI argument parser for grab-url bin, plus URL type detection.
 */
/** Minimal yargs-style arg parser used by the grab-url CLI */
export declare class ArgParser {
    commands: Record<string, {
        desc: string;
        handler?: any;
        required: boolean;
    }>;
    options: Record<string, any>;
    examples: Array<{
        cmd: string;
        desc: string;
    }>;
    helpText: string;
    versionText: string;
    usage(text: string): this;
    command(pattern: string, desc: string, handler?: any): this;
    option(name: string, opts?: any): this;
    example(cmd: string, desc: string): this;
    help(): this;
    alias(short: string, long: string): this;
    version(v: string): this;
    strict(): this;
    parseSync(): Record<string, any>;
    coerceValue(optName: string, value: string): any;
    findLongName(shortFlag: string): string;
    showHelp(): void;
}
/**
 * Detect whether a URL points to a file download (has a file extension).
 * @param url - The URL string to inspect
 */
export declare function isFileUrl(url: string): boolean;
