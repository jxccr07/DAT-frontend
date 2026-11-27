// Runs after `next build`: removes the exact Next.js version that the client bundle
// publishes as `window.next.version`, so fingerprinting tools can't map the site to known CVEs.
// Only that one literal is touched; nothing at runtime reads it.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { version } = require("next/package.json");
const needle = `window.next={version:"${version}"`;
const replacement = `window.next={version:""`;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (path.endsWith(".js")) yield path;
  }
}

let changed = 0;
for (const file of files(".next/static")) {
  const text = readFileSync(file, "utf8");
  if (text.includes(needle)) {
    writeFileSync(file, text.replaceAll(needle, replacement));
    changed++;
  }
}
console.log(changed ? `strip-version: hid the Next.js version in ${changed} file(s)` : "strip-version: nothing to hide");
