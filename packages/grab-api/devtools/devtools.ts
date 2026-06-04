/**
 * @file ui/devtools.ts
 * @description Visual development tools for the Grab API.
 * Includes a modal overlay for inspect request history (Ctrl+Alt+I).
 */

import { printJSONStructure } from "@grab-url/log";
import { GrabFunction } from "../common/types";

/**
 * Shows a message in a modal overlay with a scrollable message stack.
 * Easier to dismiss than native alert() and does not block window execution.
 *
 * @param msg - The message or HTML content to display.
 */
export function showAlert(msg: string) {
  if (typeof document === "undefined") return;
  let o = document.getElementById("alert-overlay"),
    list: HTMLElement;

  if (!o) {
    o = document.body.appendChild(document.createElement("div"));
    o.id = "alert-overlay";
    o.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center",
    );
    o.innerHTML = `<div id="alert-box" style="background:#fff;padding:1.5em 2em;border-radius:8px;box-shadow:0 2px 16px #0003;min-width:320px;max-width:90vw;max-height:80vh;position:relative;display:flex;flex-direction:column;">
      <button id="close-alert" style="position:absolute;top:12px;right:20px;font-size:1.5em;background:none;border:none;cursor:pointer;color:black;">&times;</button>
      <div id="alert-list" style="overflow:auto;flex:1;font-family:monospace;font-size:13px;"></div>
    </div>`;

    o.addEventListener("click", (e) => e.target == o && o!.remove());
    const closeBtn = document.getElementById("close-alert");
    if (closeBtn) closeBtn.onclick = () => o!.remove();
  }

  list = document.getElementById("alert-list")!;
  list.innerHTML += `<div style="border-bottom:1px solid #e5e7eb;margin:0.5em 0;padding-bottom:0.5em">${msg}</div>`;
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sets up development tools for debugging API requests.
 * Adds a keyboard shortcut (Ctrl+Alt+I) to toggle a modal showing the request history from `grab.log`.
 */
export function setupDevTools() {
  if (typeof document === "undefined") return;

  document.addEventListener("keydown", (e) => {
    // Check for global grab on window
    const grab = (window as any).grab as GrabFunction;
    if (!grab || !grab.log) return;

    if (e.key === "i" && e.ctrlKey && e.altKey) {
      let html = "";
      for (const request of grab.log) {
        const time = new Date(request.lastFetchTime).toLocaleString();
        const requestStructure = printJSONStructure(request.request, 0, "html");
        const responseStructure = printJSONStructure(request.response, 0, "html");
        const responseRaw = escapeHtml(JSON.stringify(request.response, null, 2));

        html += `
          <details open style="margin-bottom:0.75em">
            <summary style="cursor:pointer;font-weight:bold;padding:4px 0;list-style:none;display:flex;justify-content:space-between">
              <span style="color:#1a56db">${escapeHtml(request.path)}</span>
              <span style="color:#6b7280;font-weight:normal;margin-left:1em">${time}</span>
            </summary>
            <div style="padding-left:1em;margin-top:0.5em">
              <details style="margin-bottom:0.4em">
                <summary style="cursor:pointer;color:#6b7280;font-size:0.9em">Request</summary>
                <div style="padding:0.4em 0 0 1em">${requestStructure}</div>
              </details>
              <details open style="margin-bottom:0.4em">
                <summary style="cursor:pointer;color:#6b7280;font-size:0.9em">Response (structure)</summary>
                <div style="padding:0.4em 0 0 1em">${responseStructure}</div>
              </details>
              <details style="margin-bottom:0.4em">
                <summary style="cursor:pointer;color:#6b7280;font-size:0.9em">Response (data)</summary>
                <pre style="margin:0.4em 0 0 1em;padding:0.5em;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;overflow:auto;max-height:300px;font-size:12px">${responseRaw}</pre>
              </details>
            </div>
          </details>`;
      }
      showAlert(html || "<em>No requests logged yet.</em>");
    }
  });
}
