/**
 * Available color names
 */
export declare enum ColorName {
    RESET = "reset",
    BLACK = "black",
    RED = "red",
    GREEN = "green",
    YELLOW = "yellow",
    BLUE = "blue",
    MAGENTA = "magenta",
    CYAN = "cyan",
    WHITE = "white",
    GRAY = "gray",
    BRIGHT_RED = "brightRed",
    BRIGHT_GREEN = "brightGreen",
    BRIGHT_YELLOW = "brightYellow",
    BRIGHT_BLUE = "brightBlue",
    BRIGHT_MAGENTA = "brightMagenta",
    BRIGHT_CYAN = "brightCyan",
    BRIGHT_WHITE = "brightWhite",
    BG_RED = "bgRed",
    BG_GREEN = "bgGreen",
    BG_YELLOW = "bgYellow",
    BG_BLUE = "bgBlue",
    BG_MAGENTA = "bgMagenta",
    BG_CYAN = "bgCyan",
    BG_WHITE = "bgWhite",
    BG_GRAY = "bgGray",
    BG_BLACK = "bgBlack",
    BG_BRIGHT_RED = "bgBrightRed",
    BG_BRIGHT_GREEN = "bgBrightGreen",
    BG_BRIGHT_YELLOW = "bgBrightYellow",
    BG_BRIGHT_BLUE = "bgBrightBlue",
    BG_BRIGHT_MAGENTA = "bgBrightMagenta",
    BG_BRIGHT_CYAN = "bgBrightCyan",
    BG_BRIGHT_WHITE = "bgBrightWhite"
}
/**
 * @file logging/colors.ts
 * @description Color definitions and mapping for the Grab API logger.
 * Supports both ANSI (terminal) and HTML formats.
 */
/**
 * Returns color codes based on the specified format
 */
export declare function getColors(format?: 'html' | 'ansi'): Record<ColorName, string>;
