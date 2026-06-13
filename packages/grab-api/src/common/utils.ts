/**
 * @file common/utils.ts
 * @description Common utility functions used across the Grab API.
 * Includes helpers for debouncing, URL building, and asynchronous waiting.
 */

/**
 * Delays execution so that future calls may override and only executes the last one.
 * Useful for search inputs or other high-frequency events.
 * 
 * @param func - The function to debounce.
 * @param wait - Time to wait in milliseconds.
 * @returns A debounced version of the function.
 */
export const debouncer = async (func: Function, wait: number) => {
    let timeout: any;
    return async function executedFunction(...args: any[]) {
        const later = async () => {
            clearTimeout(timeout);
            await func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Helper function to wait for a specified number of seconds.
 * 
 * @param s - Seconds to wait.
 * @returns A promise that resolves after the timeout.
 */
export const wait = (s: number) => new Promise((res) => setTimeout(res, s * 1000 || 0));

/**
 * Normalizes and builds a URL from a base and relative path.
 * 
 * @param baseURL - The base API URL.
 * @param path - The specific endpoint path.
 * @returns An object containing the combined URL and updated baseURL/path if needed.
 */
export const buildUrl = (baseURL: string, path: string) => {
    let s = (t: string) => path?.startsWith(t) || false;
    let finalBaseURL = baseURL;
    let finalPath = path;

    if (path?.startsWith("http:") || path?.startsWith("https:")) {
        finalBaseURL = "";
    } else if (!s("/") && !finalBaseURL.endsWith("/")) {
        finalPath = "/" + path;
    } else if (s("/") && finalBaseURL.endsWith("/")) {
        finalPath = path.slice(1);
    }

    return { baseURL: finalBaseURL, path: finalPath };
};



/**
 * Detects whether a string contains URL-safe / escaped HTML entities,
 * either named (e.g. &amp; &lt; &rsquo;) or numeric (e.g. &#39; &#x263A;).
 * Used to auto-apply {@link convertURLSafeHTMLToHTML} only when needed.
 * @param {string} str - The string to test.
 * @return {boolean} True if escaped HTML entities are present.
 * @category HTML Utilities
 */
export const hasHTMLEntities = (str: string): boolean =>
  typeof str === "string" &&
  /&(?:[a-zA-Z][a-zA-Z0-9]+|#\d+|#x[0-9a-fA-F]+);/.test(str);

/**
 * Converts URL-safe escaped HTML codes like &"'`&rsquo; & to standard HTML or in reverse.
 * @param {string} str - The string to process.
 * @param {boolean} toStandardHTML  default=true - If true, converts url-safe codes
 * to standard HTML. If false, converts standard HTML to url-safe codes.
 * @return {string} The processed string.
 * @category HTML Utilities
 * @example
 * var normalHTML = convertURLSafeHTMLToHTML('&lt;p&gt;This &amp; that &copy; 2023 '+
 * '&quot;Quotes&quot;&#39;Apostrophes&#39; &euro;100 &#x263A;&lt;/p&gt;', true)
 * console.log(normalHTML) // "<p>This & that \u00a9 2023 "Quotes" 'Apostrophes' \u20ac100 \u263a</p>"
 */
export function convertURLSafeHTMLToHTML(str, toStandardHTML = true) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    " ": "&nbsp;",
    "'": "&#39;",
    "`": "&#96;",
    "\u00a2": "&cent;",
    "\u00a3": "&pound;",
    "\u00a5": "&yen;",
    "\u20ac": "&euro;",
    "\u00a9": "&copy;",
    "\u00ae": "&reg;",
    "\u2122": "&trade;",
  };

  // Add numeric character references for Latin-1 Supplement characters
  for (let i = 160; i <= 255; i++) {
    entityMap[String.fromCharCode(i)] = `&#${i};`;
  }

  if (toStandardHTML) {
    // Create a reverse mapping for unescaping
    const reverseEntityMap = Object.fromEntries(
      Object.entries(entityMap).map(([k, v]) => [v, k])
    );

    // Add alternative representations
    reverseEntityMap["&apos;"] = "'";
    reverseEntityMap["&laquo;"] = "\u00ab";
    reverseEntityMap["&raquo;"] = "\u00bb";

    // Regex to match all types of HTML entities
    const entityRegex = new RegExp(
      Object.keys(reverseEntityMap).join("|") + "|&#[0-9]+;|&#x[0-9a-fA-F]+;",
      "g"
    );

    str = str.replace(entityRegex, (entity) => {
      if (entity.startsWith("&#x")) {
        // Convert hexadecimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
      } else if (entity.startsWith("&#")) {
        // Convert decimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
      }
      // Convert named entity
      return reverseEntityMap[entity] || entity;
    });

    str = str.replace(/[\u0300-\u036f]/g, ""); //special chars

    return str;
  } else {
    // Regex to match all characters that need to be escaped
    const charRegex = new RegExp(`[${Object.keys(entityMap).join("")}]`, "g");
    return str.replace(charRegex, (char) => entityMap[char]);
  }
}