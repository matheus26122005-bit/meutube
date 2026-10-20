// Usa o SQLite embutido no Node (node:sqlite), sem modulo nativo para compilar.
// Isso permite rodar em qualquer lugar, inclusive no Termux (Android).
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(path.join(DATA_DIR, 'videos.db'));

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    filename TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Colunas adicionadas para suportar imagens alem de videos
const names = sqlite.prepare('PRAGMA table_info(videos)').all().map((c) => c.name);
if (!names.includes('type')) sqlite.exec("ALTER TABLE videos ADD COLUMN type TEXT NOT NULL DEFAULT 'video'");
if (!names.includes('mimetype')) sqlite.exec('ALTER TABLE videos ADD COLUMN mimetype TEXT');

// Mesma interface com callbacks usada pelo server.js: get, all, run
function call(method, sql, params, cb) {
  let result, error = null;
  try {
    result = sqlite.prepare(sql)[method](...(params || []));
  } catch (err) {
    error = err;
  }
  if (cb) process.nextTick(() => cb(error, result));
  else if (error) console.error(error);
}

module.exports = {
  get: (sql, params, cb) => call('get', sql, params, cb),
  all: (sql, params, cb) => call('all', sql, params, cb),
  run: (sql, params, cb) => call('run', sql, params, cb),
  DATA_DIR,
  ready: Promise.resolve()
};
