const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato nao suportado.'));
  }
});

app.use(express.static('public'));
app.use(express.json());

app.get('/api/videos', (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const like = '%' + search + '%';

  db.get('SELECT COUNT(*) as count FROM videos WHERE title LIKE ?', [like], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = row.count;
    db.all(
      'SELECT id, title, description, views, created_at FROM videos WHERE title LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [like, limit, offset],
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
    if (!video) return res.status(404).json({ error: 'Video nao encontrado' });
    db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    video.views += 1;
    res.json(video);
  });
});

app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const { title, description } = req.body;
  if (!title || title.trim() === '') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Titulo e obrigatorio.' });
  }
  const id = uuidv4();
  db.run(
    'INSERT INTO videos (id, title, description, filename) VALUES (?, ?, ?, ?)',
    [id, title.trim(), description || '', req.file.filename],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.get('/stream/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Arquivo nao encontrado.');
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
