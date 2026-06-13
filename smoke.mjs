const ok = [], fail = [];
async function t(p) {
  try { await import(p); ok.push(p); }
  catch (e) { fail.push(p + ' :: ' + e.message.split('\n')[0]); }
}
await t('./packages/grab-url-cli/src/display/spinner-config.ts');
await t('./packages/grab-url-cli/src/file-downloader.ts');
console.log('OK:', ok.length); ok.forEach(x => console.log('  +', x));
console.log('FAIL:', fail.length); fail.forEach(x => console.log('  x', x));
