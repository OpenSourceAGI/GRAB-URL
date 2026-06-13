/**
 * Available color names
 */
export enum ColorName {
    RESET = 'reset',
    BLACK = 'black',
    RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    BLUE = 'blue',
    MAGENTA = 'magenta',
    CYAN = 'cyan',
    WHITE = 'white',
    GRAY = 'gray',
    BRIGHT_RED = 'brightRed',
    BRIGHT_GREEN = 'brightGreen',
    BRIGHT_YELLOW = 'brightYellow',
    BRIGHT_BLUE = 'brightBlue',
    BRIGHT_MAGENTA = 'brightMagenta',
    BRIGHT_CYAN = 'brightCyan',
    BRIGHT_WHITE = 'brightWhite',
    BG_RED = 'bgRed',
    BG_GREEN = 'bgGreen',
    BG_YELLOW = 'bgYellow',
    BG_BLUE = 'bgBlue',
    BG_MAGENTA = 'bgMagenta',
    BG_CYAN = 'bgCyan',
    BG_WHITE = 'bgWhite',
    BG_GRAY = 'bgGray',
    BG_BLACK = 'bgBlack',
    BG_BRIGHT_RED = 'bgBrightRed',
    BG_BRIGHT_GREEN = 'bgBrightGreen',
    BG_BRIGHT_YELLOW = 'bgBrightYellow',
    BG_BRIGHT_BLUE = 'bgBrightBlue',
    BG_BRIGHT_MAGENTA = 'bgBrightMagenta',
    BG_BRIGHT_CYAN = 'bgBrightCyan',
    BG_BRIGHT_WHITE = 'bgBrightWhite',
}

/**
 * Color mapping with ANSI codes and HTML hex values (readable on white background)
 */
const colorMap: Record<ColorName, [number, string]> = {
    [ColorName.RESET]: [0, '000000'],
    [ColorName.BLACK]: [30, '1f2937'],
    [ColorName.RED]: [31, 'dc2626'],
    [ColorName.GREEN]: [32, '2d6a4f'],
    [ColorName.YELLOW]: [33, '92400e'],
    [ColorName.BLUE]: [34, '1a56db'],
    [ColorName.MAGENTA]: [35, '6d28d9'],
    [ColorName.CYAN]: [36, '0e7490'],
    [ColorName.WHITE]: [37, '374151'],
    [ColorName.GRAY]: [90, '6b7280'],
    [ColorName.BRIGHT_RED]: [91, 'ef4444'],
    [ColorName.BRIGHT_GREEN]: [92, '059669'],
    [ColorName.BRIGHT_YELLOW]: [93, 'd97706'],
    [ColorName.BRIGHT_BLUE]: [94, '3b82f6'],
    [ColorName.BRIGHT_MAGENTA]: [95, '8b5cf6'],
    [ColorName.BRIGHT_CYAN]: [96, '06b6d4'],
    [ColorName.BRIGHT_WHITE]: [97, 'f9fafb'],
    [ColorName.BG_BLACK]: [40, '111827'],
    [ColorName.BG_RED]: [41, 'fca5a5'],
    [ColorName.BG_GREEN]: [42, 'a7f3d0'],
    [ColorName.BG_YELLOW]: [43, 'fde68a'],
    [ColorName.BG_BLUE]: [44, 'bfdbfe'],
    [ColorName.BG_MAGENTA]: [45, 'ddd6fe'],
    [ColorName.BG_CYAN]: [46, 'a5f3fc'],
    [ColorName.BG_WHITE]: [47, 'f9fafb'],
    [ColorName.BG_GRAY]: [100, 'd1d5db'],
    [ColorName.BG_BRIGHT_RED]: [101, 'fee2e2'],
    [ColorName.BG_BRIGHT_GREEN]: [102, 'd1fae5'],
    [ColorName.BG_BRIGHT_YELLOW]: [103, 'fef3c7'],
    [ColorName.BG_BRIGHT_BLUE]: [104, 'dbeafe'],
    [ColorName.BG_BRIGHT_MAGENTA]: [105, 'ede9fe'],
    [ColorName.BG_BRIGHT_CYAN]: [106, 'cffafe'],
    [ColorName.BG_BRIGHT_WHITE]: [107, 'ffffff'],
};

/**
 * @file logging/colors.ts
 * @description Color definitions and mapping for the Grab API logger.
 * Supports both ANSI (terminal) and HTML formats.
 */

/**
 * Returns color codes based on the specified format
 */
export function getColors(format: 'html' | 'ansi' = 'ansi'): Record<ColorName, string> {
    const colors: Record<ColorName, string> = {} as Record<ColorName, string>;
    for (const [name, [ansiCode, hexCode]] of Object.entries(colorMap)) {
        if (format === 'html') {
            colors[name as ColorName] = name === ColorName.RESET
                ? '</span>'
                : `<span style="color:#${hexCode}">`;
        } else {
            colors[name as ColorName] = '\x1b[' + ansiCode + 'm';
        }
    }
    return colors;
}
