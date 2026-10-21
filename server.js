const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(db.DATA_DIR, 'uploads');
const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB) || 500;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'];

function mediaType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (VIDEO_EXTS.includes(ext) && (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream'))
    return 'video';
  if (IMAGE_EXTS.includes(ext) && file.mimetype.startsWith('image/')) return 'image';
  return null;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (mediaType(file)) cb(null, true);
    else cb(new Error('Formato nao suportado. Envie um video ou uma imagem.'));
  }
});

app.use(express.static('public'));
app.use(express.json());

app.get('/api/videos', (req, res) => {
  const search = req.query.search || '';
  const type = ['video', 'image'].includes(req.query.type) ? req.query.type : null;
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const like = '%' + search + '%';
  const where = 'WHERE title LIKE ?' + (type ? ' AND type = ?' : '');
  const params = type ? [like, type] : [like];

  db.get('SELECT COUNT(*) as count FROM videos ' + where, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = row.count;
    db.all(
      'SELECT id, title, description, filename, type, views, created_at FROM videos ' +
        where +
        ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, limit, offset],
      (err2, videos) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ videos: videos || [], total, page, pages: Math.ceil(total / limit) || 1 });
      }
    );
  });
});

app.get('/api/videos/:id', (req, res) => {
  db.get('SELECT * FROM videos WHERE id = ?', [req.params.id], (err, video) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!video) return res.status(404).json({ error: 'Arquivo nao encontrado' });
    db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    video.views += 1;
    res.json(video);
  });
});

// Aceita o campo "file" (novo) ou "video" (antigo)
const uploadAny = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

app.post('/api/upload', (req, res) => {
  uploadAny(req, res, (uploadErr) => {
    if (uploadErr) {
      const msg =
        uploadErr.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande. Limite: ' + MAX_MB + ' MB.' : uploadErr.message;
      return res.status(400).json({ error: msg });
    }
    const file = (req.files && (req.files.file || req.files.video) || [])[0];
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const { title, description } = req.body;
    if (!title || title.trim() === '') {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Titulo e obrigatorio.' });
    }
    const id = uuidv4();
    db.run(
      'INSERT INTO videos (id, title, description, filename, type, mimetype) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title.trim().slice(0, 100), (description || '').slice(0, 5000), file.filename, mediaType(file), file.mimetype],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
      }
    );
  });
});

// express.static ja trata Range (necessario para avancar o video), Content-Type e impede "../"
app.use('/stream', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '7d' }));
app.use('/stream', (err, req, res, next) => res.status(err.status || 404).send('Arquivo nao encontrado.'));

db.ready
  .then(() => app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT)))
  .catch((err) => {
    console.error('Erro ao iniciar o banco de dados:', err);
    process.exit(1);
  });
