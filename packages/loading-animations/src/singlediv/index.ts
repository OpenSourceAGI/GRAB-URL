// Random single-div CSS drawings from https://a.singlediv.com by Lynn Fisher.
// The stylesheet is lazy loaded (only when the target scrolls into view) and
// rendered inside a Shadow DOM so its global CSS reset never touches the host page.

/** Stylesheet holding every single-div drawing, keyed by element id. */
export const SINGLEDIV_CSS_URL = "https://a.singlediv.com/css/main.css";

/**
 * Every drawing id selector found in `main.css` (the `#id` in `<div class="entry" id="...">`).
 * Bundled because a.singlediv.com sends no CORS headers, so the browser cannot read the
 * rules back out of the cross-origin stylesheet. Refresh with `loadSingleDivIds()`.
 */
export const SINGLEDIV_IDS: readonly string[] = [
  "rosette-1", "rosette-2", "rosette-3", "hello", "icon-film", "icon-camera",
  "icon-polaroid", "aesthetic", "grid", "byebyecube", "radio", "washi",
  "planet", "licorice", "six", "window", "noodles1", "noodles2", "noodles3",
  "dotmatrix", "hot", "old-timey", "boxed", "knot", "egg", "digital", "bright",
  "fly", "hairy", "slow", "train", "reflection", "repeating", "radio2", "ship",
  "music", "parasite", "little", "hidden", "winding", "iconic", "power",
  "surreal", "juicy", "deep", "surprise", "sharp", "letter", "rhyme", "turtle",
  "zap", "seven", "fan", "watch", "quick", "loop", "tired", "hungry", "toxic",
  "growing", "homonym", "organized", "slice", "squeak", "camouflage", "fancy",
  "float", "snow2", "stack", "shine", "nostalgia", "journey", "magic",
  "critter", "loud", "smelly", "dip", "spice", "film", "dots", "fruit",
  "contrast", "spooky", "eight", "mooncake-1", "mooncake-2", "badge", "dry",
  "snack", "quiet", "stamp", "meaty", "wonder", "haunted", "rise", "game",
  "burger", "shadow", "forever", "splash", "erase", "hypnotic", "stripes",
  "pun", "mythical", "ten", "valuable", "soft", "pop", "cubed", "luminous",
  "vintage", "grain", "monster", "free", "beloved", "brew", "nine", "fall",
  "impossible", "artist", "crawl", "lost", "bounce", "treat", "mix", "space",
  "sparkle", "bones", "glass", "collect", "small", "remember", "tangled",
  "brave", "component", "sticky", "seeing", "faraway", "alive", "fake",
  "feast", "cheesy", "cold", "rules", "handmade", "pin", "discontinued",
  "witchy", "fin",
];

// Drawings whose inner div opts out of the site's default `scale(.8)`.
const NO_SCALE = new Set([
  "handmade", "rules", "cheesy", "fake", "faraway", "seeing", "sticky", "component",
  "brave", "remember", "small", "collect", "sparkle", "space", "mix", "crawl",
  "luminous", "pop", "valuable", "mythical", "stripes", "erase", "forever", "rise",
  "wonder", "mooncake-1", "mooncake-2", "spooky", "contrast", "spice", "loud", "magic",
  "growing", "fan", "zap", "letter", "train", "hairy", "fly", "digital", "noodles1",
  "noodles2", "noodles3", "byebyecube",
]);

// Drawings drawn entirely on the `.entry` element itself, with no inner div.
const NO_INNER = new Set([
  "tangled", "treat", "snack", "dots", "organized", "repeating", "reflection",
  "dotmatrix", "window", "licorice", "washi",
]);

export type SingleDivOptions = {
  /** Drawing id to show; defaults to a random one. */
  id?: string;
  /** Pool of ids to pick from; defaults to `SINGLEDIV_IDS`. */
  ids?: readonly string[];
  /** Stylesheet URL (e.g. a self-hosted copy); default `SINGLEDIV_CSS_URL`. */
  cssUrl?: string;
  /** Wait until the target is visible before loading the CSS (default true). */
  lazy?: boolean;
  /** Height of the drawing box in px (default 400). */
  height?: number;
  /** Zoom factor applied to the drawing (default 1). */
  scale?: number;
};

export type SingleDivHandle = {
  /** The chosen drawing id. */
  id: string;
  /** Host element appended to the target (holds the shadow root). */
  element: HTMLElement;
  /** Resolves once the stylesheet has loaded (or failed). */
  loaded: Promise<void>;
  /** Removes the drawing and cancels a pending lazy load. */
  remove: () => void;
};

/** Extracts every `#id` used in a selector (not hex colors in declarations) from CSS text. */
export function parseSingleDivIds(cssText: string): string[] {
  const ids = new Set<string>();
  let selector = "";
  for (const ch of cssText.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      if (!selector.trim().startsWith("@"))
        for (const m of selector.matchAll(/#([a-zA-Z][\w-]*)/g)) ids.add(m[1]);
      selector = "";
    } else if (ch === "}") selector = "";
    else selector += ch;
  }
  return [...ids];
}

/**
 * Fetches the stylesheet and returns all drawing ids in it. Falls back to the bundled
 * `SINGLEDIV_IDS` when the fetch fails (the default URL is blocked by CORS in browsers).
 */
export async function loadSingleDivIds(cssUrl = SINGLEDIV_CSS_URL): Promise<string[]> {
  try {
    const res = await fetch(cssUrl);
    if (res.ok) {
      const ids = parseSingleDivIds(await res.text());
      if (ids.length) return ids;
    }
  } catch {}
  return [...SINGLEDIV_IDS];
}

/** Returns a random drawing id. */
export const randomSingleDivId = (ids: readonly string[] = SINGLEDIV_IDS): string =>
  ids[Math.floor(Math.random() * ids.length)];

/**
 * Shows a random single-div drawing inside `target`, lazy loading the stylesheet.
 * @example showRandomSingleDiv("#loader", { height: 300, scale: 0.75 });
 */
export function showRandomSingleDiv(
  target: HTMLElement | string,
  options: SingleDivOptions = {},
): SingleDivHandle {
  const parent = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!parent) throw new Error(`showRandomSingleDiv: target not found: ${target}`);

  const {
    ids = SINGLEDIV_IDS,
    id = randomSingleDivId(ids),
    cssUrl = SINGLEDIV_CSS_URL,
    lazy = true,
    height = 400,
    scale = 1,
  } = options;

  const element = document.createElement("div");
  element.dataset.singlediv = id;
  element.style.cssText = `display:block;width:100%;height:${height * scale}px;overflow:hidden`;
  const root = element.attachShadow({ mode: "open" });
  parent.appendChild(element);

  let resolveLoaded!: () => void;
  const loaded = new Promise<void>((r) => (resolveLoaded = r));
  let observer: IntersectionObserver | undefined;

  const render = () => {
    observer?.disconnect();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.onload = link.onerror = () => resolveLoaded();
    const style = document.createElement("style");
    style.textContent = `.entry{width:100%!important;min-height:${height}px!important;zoom:${scale}}`;
    const entry = document.createElement("div");
    entry.className = "entry";
    entry.id = id;
    if (!NO_INNER.has(id)) {
      const inner = document.createElement("div");
      if (NO_SCALE.has(id)) inner.className = "no-scale";
      entry.appendChild(inner);
    }
    root.append(link, style, entry);
  };

  if (lazy && typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) render();
    });
    observer.observe(element);
  } else render();

  return {
    id,
    element,
    loaded,
    remove: () => {
      observer?.disconnect();
      element.remove();
      resolveLoaded();
    },
  };
}
