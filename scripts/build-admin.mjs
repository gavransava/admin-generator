#!/usr/bin/env node
/**
 * Build script for the unified `admin-dist/` deploy artifact.
 *
 * Runs `npm run build` for @studio/generator and @studio/backoffice
 * (each targeting their own dist/), then copies:
 *   backoffice/dist/*  → admin-dist/*        (root — served at admin.zakazisam.rs)
 *   generator/dist/*   → admin-dist/studio/* (served at admin.zakazisam.rs/studio)
 *
 * Also emits the CF Pages routing files (`_headers`, `_redirects`) so the
 * SPA fallbacks work for both surfaces.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = join(repoRoot, "admin-dist");

function log(msg) {
  process.stdout.write(`[build-admin] ${msg}\n`);
}

function run(cmd) {
  log(`$ ${cmd}`);
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

// 1. Fresh output
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 2. Ensure shared packages are built
run("npm run build -w @studio/admin-schema");

// 3. Build both apps
run("npm run build -w @studio/backoffice");
run("npm run build -w @studio/generator");

// 4. Copy outputs into unified structure
const boSrc = join(repoRoot, "backoffice", "dist");
const genSrc = join(repoRoot, "generator", "dist");
if (!existsSync(boSrc)) throw new Error("backoffice/dist missing");
if (!existsSync(genSrc)) throw new Error("generator/dist missing");

log("copy backoffice/dist → admin-dist/");
copyDir(boSrc, outDir);

log("copy generator/dist → admin-dist/studio/");
copyDir(genSrc, join(outDir, "studio"));

// 5. CF Pages routing files
const headers = `# Long-cache hashed assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Never cache index files
/index.html
  Cache-Control: no-cache
/studio/index.html
  Cache-Control: no-cache
`;
writeFileSync(join(outDir, "_headers"), headers);

const redirects = `# SPA fallback: Studio owns /studio/*, Backoffice owns everything else.
/studio/*  /studio/index.html  200
/*         /index.html         200
`;
writeFileSync(join(outDir, "_redirects"), redirects);

log("done → admin-dist/");
