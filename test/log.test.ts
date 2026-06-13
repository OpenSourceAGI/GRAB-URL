/**
 * @file log.test.ts
 * @description Unit tests for the log() utility function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from '../packages/log-json/src/log-json.js';

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'debug').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('log() — string messages', () => {
    it('calls a console method for a plain string', () => {
        log('Hello world');
        const called =
            (console.log as any).mock.calls.length > 0 ||
            (console.debug as any).mock.calls.length > 0;
        expect(called).toBe(true);
    });

    it('does not throw for empty string', () => {
        expect(() => log('')).not.toThrow();
    });

    it('does not throw with color option', () => {
        expect(() => log('Styled', { color: 'red' })).not.toThrow();
    });
});

describe('log() — object messages', () => {
    it('does not throw for plain objects', () => {
        expect(() => log({ name: 'test', value: 42 })).not.toThrow();
    });

    it('does not throw for arrays', () => {
        expect(() => log([1, 2, 3])).not.toThrow();
    });

});

describe('log() — spinner options', () => {
    it('does not throw with startSpinner option', () => {
        expect(() => log('Starting…', { startSpinner: true, color: 'cyan' })).not.toThrow();
    });

    it('does not throw with stopSpinner option', () => {
        expect(() => log('Done!', { stopSpinner: true })).not.toThrow();
    });
});
