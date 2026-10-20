const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(path.join(DATA_DIR, 'videos.db'));

const ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(`
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
    db.all('PRAGMA table_info(videos)', (err, cols) => {
      if (err) return reject(err);
      const names = cols.map((c) => c.name);
      db.serialize(() => {
        if (!names.includes('type')) db.run("ALTER TABLE videos ADD COLUMN type TEXT NOT NULL DEFAULT 'video'");
        if (!names.includes('mimetype')) db.run('ALTER TABLE videos ADD COLUMN mimetype TEXT');
        db.run('SELECT 1', (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  });
});

module.exports = db;
module.exports.DATA_DIR = DATA_DIR;
module.exports.ready = ready;
