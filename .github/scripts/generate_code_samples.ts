#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import yaml from "js-yaml"; // for YAML support

const OPENAPI_URL =
  "https://app.stainless.com/api/spec/documented/kernel/openapi.documented.yml";

const TARGET_DIRS = ["browsers", "apps"]; // adjust as needed

function toTitleCase(input: string): string {
  if (!input) return "";
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
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
  method?: string
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
        const lang = rawLang.toLowerCase();

        let fenceInfo: string;
        if (["typescript", "ts", "javascript", "js"].includes(lang)) {
          fenceInfo = "typescript Typescript";
        } else if (rawLang) {
          fenceInfo = `${lang} ${toTitleCase(rawLang)}`;
        } else {
          fenceInfo = "";
        }

        blocks.push(`\n\`\`\`${fenceInfo}\n${sample.source.trim()}\n\`\`\`\n`);
      }
    }
  }

  return blocks.length > 0
    ? blocks.join("\n")
    : `⚠️ No code samples for ${
        method ? method.toUpperCase() : "any"
      } ${endpoint}`;
}

async function processFile(file: string, spec: any) {
  let content = await readFile(file, "utf8");

  // Matches {{ get /path }} or {{ post /path }} or {{ /path }}
  const regex =
    /\{\{\s*(?:(get|post|put|delete|patch|options|head)\s+)?(\/[^\s}]+)\s*\}\}/gi;

  let changed = false;
  content = content.replace(regex, (_, method, endpoint) => {
    changed = true;
    return extractCodeSamples(spec, endpoint, method);
  });

  if (changed) {
    console.log(`✏️ Updating ${file}`);
    await writeFile(file, content, "utf8");
  }
}

async function main() {
  const spec = await fetchOpenAPISpec();

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
