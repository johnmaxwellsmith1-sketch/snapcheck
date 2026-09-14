#!/usr/bin/env node
// snapcheck — snapshot a folder to a hash manifest, verify it later.
// Zero deps (node stdlib only). read-only against the scanned tree.
//   snapcheck snap <dir> [-o manifest.json]
//   snapcheck chk  <dir> [-m manifest.json]
//   snapcheck chk  <dir> -m manifest.json --json
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_MANIFEST_NAME = ".snapcheck.json";

function usage() {
  return `snapcheck — snapshot + verify a folder's files
  snapcheck snap <dir> [-o manifest.json]
  snapcheck chk  <dir> [-m manifest.json] [--json]
  snapcheck snap <dir>      # writes <dir>/.snapcheck.json, then exits
  snapcheck chk  <dir>      # verifies <dir>/.snapcheck.json
Exit codes: snap -> 0 (or 2 on error); chk -> 0 unchanged, 1 changed, 2 error`;
}

// Walk a directory, returning [{p, size, mtime}] for regular files.
// Skips symlinks (avoid loops) and the default manifest file we would write.
function listFiles(root, manifestName) {
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile()) {
        if (full === path.join(root, manifestName)) continue;
        const st = fs.statSync(full);
        out.push({ p: full, size: st.size, mtime: st.mtimeMs });
      }
    }
  };
  walk(root);
  return out;
}

function rel(root, full) {
  return path.relative(root, full) || ".";
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function snap(root, manifestPath) {
  const files = listFiles(root, path.basename(manifestPath));
  const manifest = {
    tool: "snapcheck",
    version: 1,
    root: path.resolve(root),
    takenAt: new Date().toISOString(),
    files: files.map((f) => ({
      p: rel(root, f.p),
      size: f.size,
      mtime: f.mtime,
      sha256: sha256(f.p),
    })),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { count: files.length, manifestPath };
}

function chk(root, manifestPath, asJson) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (manifest.tool !== "snapcheck" || manifest.root !== path.resolve(root)) {
    throw new Error("manifest root does not match target dir");
  }
  const recorded = new Map(manifest.files.map((f) => [f.p, f]));
  const current = new Map(
    listFiles(root, path.basename(manifestPath)).map((f) => [rel(root, f.p), f])
  );

  const unchanged = [];
  const modified = []; // content changed (or same size+mtime but different hash = bit-rot hint)
  const added = [];
  const missing = [];

  for (const [p, rec] of recorded) {
    const cur = current.get(p);
    if (!cur) {
      missing.push(p);
      continue;
    }
    if (cur.size !== rec.size || cur.mtime !== rec.mtime) {
      modified.push({ p, change: "size_or_mtime" });
      continue;
    }
    const h = sha256(path.join(root, p));
    if (h !== rec.sha256) {
      modified.push({ p, change: "hash_mismatch_same_meta", bitrotHint: true });
    } else {
      unchanged.push(p);
    }
  }
  for (const [p] of current) if (!recorded.has(p)) added.push(p);

  const changed = modified.length + added.length + missing.length;
  const result = {
    unchanged: unchanged.length,
    modified: modified.map((m) => m.p),
    added,
    missing,
    changed,
  };
  if (asJson) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`matched unchanged: ${unchanged.length}`);
    if (modified.length) console.log(`modified: ${modified.map((m) => m.p).join(", ")}`);
    if (added.length) console.log(`added: ${added.join(", ")}`);
    if (missing.length) console.log(`missing: ${missing.join(", ")}`);
  }
  return changed === 0 ? 0 : 1;
}

function main(argv) {
  const [cmd, rootArg] = argv;
  if (!cmd || !rootArg) {
    console.error(usage());
    return 2;
  }
  const dir = path.resolve(rootArg);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`snapcheck: not a directory: ${dir}`);
    return 2;
  }
  const i = (k) => {
    const j = argv.indexOf(k);
    return j >= 0 ? argv[j + 1] : null;
  };

  if (cmd === "snap") {
    const o = i("-o") || path.join(dir, DEFAULT_MANIFEST_NAME);
    const { count } = snap(dir, o);
    console.log(`snapcheck: snapshotted ${count} file(s) -> ${o}`);
    return 0;
  }
  if (cmd === "chk") {
    const m = i("-m") || path.join(dir, DEFAULT_MANIFEST_NAME);
    if (!fs.existsSync(m)) {
      console.error(`snapcheck: no manifest at ${m} (run 'snapcheck snap' first)`);
      return 2;
    }
    const asJson = argv.includes("--json");
    return chk(dir, m, asJson);
  }
  console.error(`snapcheck: unknown command '${cmd}'`);
  console.error(usage());
  return 2;
}

process.exitCode = main(process.argv.slice(2));
