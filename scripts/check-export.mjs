import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const forbiddenPaths = [/(^|\/)skills?(\/|$)/i, /(^|\/)prompts?(\/|$)/i, /SKILL\.md$/i];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{12,}["']/i,
  /(?:sk|ghp|github_pat)_[A-Za-z0-9_\-]{20,}/,
  /https?:\/\/(?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?/i,
];
const textExtensions = new Set([".md", ".mjs", ".js", ".json", ".yml", ".yaml", ".d.ts"]);
const failures = [];

for (const path of await walk(root)) {
  const name = relative(root.pathname, path);
  if (forbiddenPaths.some((pattern) => pattern.test(name))) failures.push(`${name}: forbidden export path`);
  if (!textExtensions.has(extname(path)) && !name.endsWith(".d.ts")) continue;
  const content = await readFile(path, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) failures.push(`${name}: matched ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Export boundary check passed.");
}

async function walk(url) {
  const paths = [];
  for (const entry of await readdir(url, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const path = join(url.pathname, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(new URL(`${entry.name}/`, url)));
    else paths.push(path);
  }
  return paths;
}
