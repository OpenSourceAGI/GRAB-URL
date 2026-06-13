/**
 * @file icon.test.ts
 * @description Unit tests for the SVG icon utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
    loadingBouncyBall,
    loadingDoubleRing,
    loadingEclipse,
    loadingSpinner,
    loadingRing,
    loadingInfinity,
    loadingGears,
} from '../packages/loading-animations/src/svg/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSVG(s: string) {
    return typeof s === 'string' && s.trimStart().startsWith('<svg');
}

const DEFAULT_COLORS = ['#0099e5', '#ff4c4c'];

// ─── Per-icon smoke tests ─────────────────────────────────────────────────────

describe('SVG Icons — output shape', () => {
    const icons: Array<[string, (opts: any) => string]> = [
        ['loadingBouncyBall', loadingBouncyBall],
        ['loadingDoubleRing', loadingDoubleRing],
        ['loadingEclipse', loadingEclipse],
        ['loadingSpinner', loadingSpinner],
        ['loadingRing', loadingRing],
        ['loadingInfinity', loadingInfinity],
        ['loadingGears', loadingGears],
    ];

    for (const [name, fn] of icons) {
        it(`${name}() returns a valid SVG string`, () => {
            const svg = fn({ colors: DEFAULT_COLORS, size: 80, raw: true });
            expect(isSVG(svg)).toBe(true);
            expect(svg).toContain('</svg>');
        });

        it(`${name}() respects the size option`, () => {
            const svg = fn({ colors: DEFAULT_COLORS, size: 120, raw: true });
            // SVG should embed the requested size in width/height attributes
            expect(svg).toMatch(/120/);
        });

        it(`${name}() accepts custom colors`, () => {
            const svg = fn({ colors: ['#abcdef', '#123456'], size: 60, raw: true });
            expect(svg).toContain('#abcdef');
        });
    }
});

describe('SVG Icons — edge cases', () => {
    it('loadingBouncyBall() returns non-empty output for size=1', () => {
        const svg = loadingBouncyBall({ colors: DEFAULT_COLORS, size: 1 });
        expect(svg.length).toBeGreaterThan(0);
    });

    it('loadingSpinner() works with a single color', () => {
        const svg = loadingSpinner({ colors: ['#ffffff'], size: 50, raw: true });
        expect(isSVG(svg)).toBe(true);
    });
});
