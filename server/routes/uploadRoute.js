const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

console.log('[Upload Route] Route dosyası yüklendi');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads');
    console.log('[Upload] Upload path:', uploadPath);
    
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('[Upload] Uploads klasörü oluşturuldu');
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('[Upload] Dosya adı:', filename);
    cb(null, filename);
  }
});


const fileFilter = (req, file, cb) => {
  console.log('[Upload] Dosya tipi kontrolü:', file.mimetype);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } 
});


router.get('/upload-test', (req, res) => {
  console.log('[Upload] Test endpoint çağrıldı');
  res.json({ message: 'Upload route çalışıyor!' });
});


router.post('/upload-image', (req, res, next) => {
  console.log('[Upload] POST /upload-image çağrıldı');
  console.log('[Upload] Headers:', req.headers);
  next();
}, upload.single('slideImage'), (req, res) => {
  console.log('[Upload] Middleware geçildi');
  console.log('[Upload] File:', req.file);
  
  if (!req.file) {
    console.log('[Upload] ✗ Dosya yüklenmedi');
    return res.status(400).json({ error: 'Dosya yüklenmedi veya dosya tipi uygun değil.' });
  }

  
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  console.log(`[Upload] ✓ Görsel yüklendi: ${imageUrl}`);
  res.json({ 
    success: true,
    imageUrl: imageUrl,
    filename: req.file.filename
  });

}, (error, req, res, next) => {
  if (error) {
    console.error('[Upload] ✗ Hata:', error.message);
    return res.status(400).json({ error: error.message });
  }
  next();
});

console.log('[Upload Route] Route tanımlandı: POST /upload-image');

module.exports = router;