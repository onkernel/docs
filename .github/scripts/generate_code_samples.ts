#!/usr/bin/env bun

import { readdir, readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import yaml from "js-yaml"; // for YAML support

const OPENAPI_URL =
  "https://app.stainless.com/api/spec/documented/kernel/openapi.documented.yml";

const TARGET_DIRS = ["browsers", "apps"]; // adjust as needed
const SNIPPETS_ROOT = path.resolve("snippets/openapi");

// Only emit code samples for these languages (normalized): e.g., ["typescript", "python"]
const TARGET_LANGUAGES = ["typescript", "python"] as const;
type SupportedLanguage =
  | (typeof TARGET_LANGUAGES)[number]
  | "javascript"
  | "go";

function normalizeLang(input: string): SupportedLanguage {
  const lc = (input || "").toLowerCase();
  if (lc === "ts" || lc === "typescript") return "typescript";
  if (lc === "py" || lc === "python") return "python";
  if (
    lc === "js" ||
    lc === "javascript" ||
    lc === "node" ||
    lc === "node.js" ||
    lc === "nodejs"
  )
    return "javascript";
  if (lc === "go" || lc === "golang") return "go";
  return lc as SupportedLanguage;
}

function renderFenceInfo(lang: SupportedLanguage, rawLang: string): string {
  if (lang === "typescript" || lang === "javascript")
    return "typescript Typescript/Javascript";
  if (lang === "python") return "python Python";
  return `${lang} ${toTitleCase(rawLang)}`;
}

function renderValueForLanguage(
  lang: SupportedLanguage,
  value: unknown
): string {
  const type = typeof value;
  if (type === "boolean") {
    const b = value as boolean;
    return lang === "python" ? (b ? "True" : "False") : b ? "true" : "false";
  }
  if (type === "number") return String(value);
  if (type === "string") {
    // Use double quotes across both for simplicity
    return JSON.stringify(value);
  }
  // Fallback to JSON for objects/arrays; Python will be JSON-like which is acceptable for docs
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function injectParamsIntoObjectLiteral(
  lang: SupportedLanguage,
  objectLiteral: string,
  params: Record<string, unknown>
): string {
  let updated = objectLiteral;
  for (const [key, val] of Object.entries(params)) {
    const valueStr = renderValueForLanguage(lang, val);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Try to replace existing key first (handles both quoted and unquoted keys)
    const keyPatterns = [
      new RegExp(`(([,\{\n\r\t\s])${escapedKey}\\s*:\\s*)([^,\n}]+)`, "m"), // JS/TS style key: value
      new RegExp(`(([,\{\n\r\t\s])\"${escapedKey}\"\\s*:\\s*)([^,\n}]+)`, "m"), // JSON/Python style "key": value
    ];
    let replaced = false;
    for (const pattern of keyPatterns) {
      if (pattern.test(updated)) {
        updated = updated.replace(pattern, `$1${valueStr}`);
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      // Insert after the first opening brace
      if (lang === "python") {
        const insertion = `"${key}": ${valueStr}, `;
        updated = updated.replace(/\{\s*/, (m) => m + insertion);
      } else {
        const isMultiline = /\{\s*\n/.test(updated);
        const indentMatch = updated.match(/\{\s*\n([ \t]*)/);
        const indent = indentMatch?.[1] ?? "";
        const insertion = isMultiline
          ? `${indent}${key}: ${valueStr},\n${indent}`
          : `${key}: ${valueStr}, `;
        if (isMultiline) {
          // Normalize to a single newline after '{' then insert our line
          updated = updated.replace(/\{\s*/, "{\n");
          updated = updated.replace(/\{\n/, `{\n${insertion}`);
        } else {
          updated = updated.replace(/\{\s*/, (m) => m + insertion);
        }
      }
    }
  }
  // For JS/TS single-line objects, remove any trailing comma before the closing brace
  if (lang !== "python") {
    updated = updated.replace(/,\s*}/, " }");
  }
  return updated;
}

function injectParamsIntoPythonArgs(
  argList: string,
  params: Record<string, unknown>
): string {
  let updated = argList;
  // Ensure trailing comma handling is clean; if arguments are on multiple lines, add newline before inserted kwarg
  for (const [key, val] of Object.entries(params)) {
    const valueStr = renderValueForLanguage("python", val);
    const pattern = new RegExp(`(\\b${key}\\s*=)\\s*([^,\n)]+)`, "m");
    if (pattern.test(updated)) {
      updated = updated.replace(pattern, `$1 ${valueStr}`);
    } else {
      const trimmed = updated.trim();
      if (trimmed.length === 0) {
        updated = `${key}=${valueStr}`;
      } else {
        const isMultiline = /\n/.test(updated);
        const hasTrailingComma = /,\s*$/.test(updated);
        if (isMultiline) {
          const firstArgIndentMatch = updated.match(/^([ \t]+)[A-Za-z_]/m);
          const lastLineIndentMatch = updated.match(/\n([ \t]*)[^\n]*$/);
          const indent =
            firstArgIndentMatch?.[1] ?? lastLineIndentMatch?.[1] ?? "    ";
          const prefix = updated.replace(/\s*$/, "");
          const commaPrefix = hasTrailingComma ? prefix : `${prefix},`;
          updated = `${commaPrefix}\n${indent}${key}=${valueStr},`;
        } else {
          const sep = hasTrailingComma ? " " : ", ";
          updated = `${updated.replace(/\s*$/, "")}${sep}${key}=${valueStr}`;
        }
      }
    }
  }
  return updated;
}

function applyOverridesToSource(
  lang: SupportedLanguage,
  src: string,
  overrides?: Record<string, unknown>
): string {
  if (!overrides || Object.keys(overrides).length === 0) return src;
  let transformed = src;

  // Heuristic: find the first object literal in a X.create(...) call and inject params (excluding special keys like 'log')
  const { log: _logOverride, ...injectionOverrides } = overrides as Record<
    string,
    unknown
  >;
  if (Object.keys(injectionOverrides).length > 0) {
    const createCall = /(\b\w+\.(create|new)\()([\s\S]*?)(\))/m;
    const match = transformed.match(createCall);
    if (match) {
      const before = transformed.slice(0, match.index ?? 0);
      const after = transformed.slice((match.index ?? 0) + match[0].length);
      const inside = match[3] ?? "";
      const objectMatch = inside.match(/\{[\s\S]*?\}/m);
      if (objectMatch) {
        const objBefore = inside.slice(0, objectMatch.index!);
        const obj = objectMatch[0];
        const objAfter = inside.slice(
          (objectMatch.index || 0) + objectMatch[0].length
        );
        const injected = injectParamsIntoObjectLiteral(
          lang,
          obj,
          injectionOverrides
        );
        const newInside = objBefore + injected + objAfter;
        transformed = before + match[1] + newInside + match[4] + after;
      } else if (lang === "python") {
        const injectedArgs = injectParamsIntoPythonArgs(
          inside,
          injectionOverrides
        );
        const needsNewlineBeforeParen =
          /\n/.test(injectedArgs) && !/\n\s*$/.test(injectedArgs);
        const joiner = needsNewlineBeforeParen ? "\n" : "";
        transformed =
          before + match[1] + injectedArgs + joiner + match[4] + after;
      } else {
        // JS/TS with no object literal: insert one and inject
        const injectedObj = injectParamsIntoObjectLiteral(
          lang,
          "{}",
          injectionOverrides
        );
        transformed = before + match[1] + injectedObj + match[4] + after;
      }
    }
  }

  // Apply log override if present: replace argument of the last console.log/print call
  const logExpr = (overrides as Record<string, unknown>)?.log;
  if (typeof logExpr === "string" && logExpr.trim().length > 0) {
    if (lang === "python") {
      const regex = /print\(([^\)]*)\)/g;
      let lastMatch: RegExpExecArray | null = null;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(transformed)) !== null) lastMatch = m;
      if (lastMatch) {
        const start = lastMatch.index;
        const end = start + lastMatch[0].length;
        transformed =
          transformed.slice(0, start) +
          `print(${logExpr})` +
          transformed.slice(end);
      }
    } else {
      const regex = /console\.log\(([^\)]*)\)/g;
      let lastMatch: RegExpExecArray | null = null;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(transformed)) !== null) lastMatch = m;
      if (lastMatch) {
        const start = lastMatch.index;
        const end = start + lastMatch[0].length;
        transformed =
          transformed.slice(0, start) +
          `console.log(${logExpr})` +
          transformed.slice(end);
      }
    }
  }

  return transformed;
}

function parseOverridesString(
  raw: string
): Record<string, unknown> | undefined {
  // Rebuild as JSON object string; heuristically quote keys
  let jsonish = `{ ${raw} }`;
  // Quote unquoted keys (simple heuristic)
  jsonish = jsonish.replace(/([,{\s])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  // Normalize single quotes to double quotes
  jsonish = jsonish.replace(/'([^']*)'/g, '"$1"');
  try {
    return JSON.parse(jsonish);
  } catch {
    return undefined;
  }
}

function extractOverridesFromAttributes(
  attrs: string | undefined
): Record<string, unknown> | undefined {
  if (!attrs) return undefined;
  const idx = attrs.indexOf("overrides=");
  if (idx === -1) return undefined;
  // Find first '{' after 'overrides='
  const start = attrs.indexOf("{", idx);
  if (start === -1) return undefined;
  let depth = 0;
  let end = -1;
  for (let i = start; i < attrs.length; i++) {
    const ch = attrs[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return undefined;
  const raw = attrs.slice(start, end + 1);
  return parseOverridesString(raw);
}

function toTitleCase(input: string): string {
  if (!input) return "";
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

type VariantConfig = { name: string; overrides?: Record<string, unknown> };
type CodeSamplesConfig = {
  variants?: Record<string, VariantConfig[]>; // key: "method /path" lowercased
};

async function readConfig(): Promise<CodeSamplesConfig> {
  const configPath = path.resolve(".github/scripts/code_samples.config.json");
  try {
    const text = await readFile(configPath, "utf8");
    return JSON.parse(text) as CodeSamplesConfig;
  } catch {
    return {};
  }
}

async function fetchOpenAPISpec() {
  console.log(`📥 Fetching OpenAPI spec from ${OPENAPI_URL}`);
  const res = await fetch(OPENAPI_URL!);
  if (!res.ok)
    throw new Error(`Failed to fetch OpenAPI spec: ${res.statusText}`);
  const text = await res.text();

  // Try JSON first, fallback to YAML
  try {
    return JSON.parse(text);
  } catch {
    return yaml.load(text);
  }
}

async function getMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getMdxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractCodeSamples(
  spec: any,
  endpoint: string,
  method?: string,
  overrides?: Record<string, unknown>
): string {
  const pathItem = spec.paths?.[endpoint];
  if (!pathItem) return `⚠️ No spec found for ${endpoint}`;

  const blocks: string[] = [];

  const methods = method ? [method.toLowerCase()] : Object.keys(pathItem); // all methods if not specified

  for (const m of methods) {
    const op = pathItem[m];
    if (op?.["x-codeSamples"]) {
      for (const sample of op["x-codeSamples"]) {
        const rawLang = typeof sample.lang === "string" ? sample.lang : "";
        const normalized = normalizeLang(rawLang);
        const allowedNormalized = [
          "typescript",
          "javascript",
          "python",
        ] as const;
        if (!(allowedNormalized as readonly string[]).includes(normalized))
          continue;
        const displayLang: "typescript" | "python" =
          normalized === "python" ? "python" : "typescript";

        const fenceInfo = renderFenceInfo(displayLang, rawLang);
        const transformedSource = applyOverridesToSource(
          displayLang,
          String(sample.source ?? "").trim(),
          overrides
        );
        blocks.push(`\n\`\`\`${fenceInfo}\n${transformedSource}\n\`\`\`\n`);
      }
    }
  }

  return blocks.length > 0
    ? blocks.join("\n")
    : `⚠️ No code samples for ${
        method ? method.toUpperCase() : "any"
      } ${endpoint}`;
}

function slugifyEndpoint(method: string, endpoint: string): string {
  const m = (method || "").toLowerCase().replace(/[^a-z]/g, "");
  let ep = endpoint.replace(/^\//, "");
  // Unwrap path params like {id} -> id
  ep = ep.replace(/\{([^}]+)\}/g, "$1");
  // Sanitize and normalize
  ep = ep
    .replace(/[^a-zA-Z0-9\-/_]/g, "-")
    .replace(/[\/]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${m}-${ep}`.toLowerCase();
}

async function writeSnippetFile(filePath: string, blocks: string) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const content = `<CodeGroup>\n${blocks.trim()}\n</CodeGroup>\n`;
  await writeFile(filePath, content, "utf8");
}

async function generateSnippets(spec: any) {
  const config = await readConfig();
  const paths = spec.paths || {};
  for (const endpoint of Object.keys(paths)) {
    const pathItem = paths[endpoint];
    for (const method of Object.keys(pathItem)) {
      const key = `${method.toLowerCase()} ${endpoint}`.toLowerCase();
      const baseBlocks = extractCodeSamples(spec, endpoint, method).trim();
      if (!baseBlocks.startsWith("⚠️ ")) {
        const baseSlug = slugifyEndpoint(method, endpoint);
        const baseFile = path.join(SNIPPETS_ROOT, `${baseSlug}.mdx`);
        await writeSnippetFile(baseFile, baseBlocks);
        console.log(
          `🧩 Wrote snippet: ${path.relative(process.cwd(), baseFile)}`
        );
      }
      const variants = config.variants?.[key] || [];
      for (const variant of variants) {
        const vBlocks = extractCodeSamples(
          spec,
          endpoint,
          method,
          variant.overrides
        ).trim();
        if (!vBlocks.startsWith("⚠️ ")) {
          const vSlug = `${slugifyEndpoint(method, endpoint)}-${variant.name}`;
          const vFile = path.join(SNIPPETS_ROOT, `${vSlug}.mdx`);
          await writeSnippetFile(vFile, vBlocks);
          console.log(
            `🧩 Wrote snippet: ${path.relative(process.cwd(), vFile)}`
          );
        }
      }
    }
  }
}

async function cleanupOldSnippets() {
  try {
    const entries = await readdir(SNIPPETS_ROOT, { withFileTypes: true });
    const stale = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => name.endsWith("-.mdx"));
    for (const name of stale) {
      const full = path.join(SNIPPETS_ROOT, name);
      await unlink(full);
      console.log(
        `🧹 Removed stale snippet: ${path.relative(process.cwd(), full)}`
      );
    }
  } catch {
    // ignore if folder doesn't exist yet
  }
}

async function processFile(file: string, spec: any) {
  let content = await readFile(file, "utf8");

  // Matches <OpenAPICodeGroup>get /path</OpenAPICodeGroup>
  // or <OpenAPICodeGroup>/path</OpenAPICodeGroup>
  const tagRegex =
    /<OpenAPICodeGroup([^>]*)>\s*(?:(get|post|put|delete|patch|options|head)\s+)?(\/[^\s<]+)(?:\s+(\{[\s\S]*?\}))?\s*<\/OpenAPICodeGroup>/gi;

  let changed = false;
  content = content.replace(
    tagRegex,
    (_, attrs, method, endpoint, jsonOverrides) => {
      changed = true;
      let overrides: Record<string, unknown> | undefined = undefined;
      const attrOverrides = extractOverridesFromAttributes(attrs);
      if (attrOverrides) overrides = { ...attrOverrides };
      if (jsonOverrides) {
        const inline = parseOverridesString(jsonOverrides);
        if (inline) overrides = { ...(overrides || {}), ...inline };
      }
      const blocks = extractCodeSamples(
        spec,
        endpoint,
        method,
        overrides
      ).trim();
      return `<CodeGroup>\n${blocks}\n</CodeGroup>`;
    }
  );

  if (changed) {
    console.log(`✏️ Updating ${file}`);
    await writeFile(file, content, "utf8");
  }
}

async function main() {
  const spec = await fetchOpenAPISpec();

  // Always generate snippet files from OpenAPI
  await cleanupOldSnippets();
  await generateSnippets(spec);

  for (const dir of TARGET_DIRS) {
    const files = await getMdxFiles(dir);
    for (const file of files) {
      await processFile(file, spec);
    }
  }

  console.log("✅ Done updating docs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
