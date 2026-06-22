const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function collectFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function extractKeysFromSource(srcDir) {
  const files = collectFiles(srcDir);
  const keyRegex = /t\(\s*['\"]([a-z0-9_.-]+)['\"]/gi;
  const keys = new Set();
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = keyRegex.exec(content))) {
      keys.add(m[1]);
    }
  }
  return keys;
}

function flatten(obj, prefix = '') {
  const res = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'object' && val !== null) {
      Object.assign(res, flatten(val, key));
    } else {
      res[key] = val;
    }
  }
  return res;
}

function main() {
  const localesDir = path.join(__dirname, '..', 'src', 'locales');
  const enPath = path.join(localesDir, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error('en.json not found at', enPath);
    process.exit(2);
  }
  const en = readJson(enPath);
  const flat = flatten(en);
  const available = new Set(Object.keys(flat));

  const used = extractKeysFromSource(path.join(__dirname, '..', 'src'));

  const missing = [];
  for (const k of used) {
    if (!available.has(k)) missing.push(k);
  }

  if (missing.length === 0) {
    console.log('All translation keys used in source exist in src/locales/en.json');
    process.exit(0);
  }

  console.log('Missing translation keys in en.json:');
  for (const m of missing.sort()) console.log(' -', m);
  process.exit(1);
}

main();
