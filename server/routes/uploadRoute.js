const express = require('express');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
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


router.post('/upload-image', upload.single('slideImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi veya dosya tipi uygun değil.' });
    }

    
    const base64Image = req.file.buffer.toString('base64');
    
    
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    console.log(`[Upload] ✓ Görsel Base64 olarak işlendi.`);
    res.json({
      success: true,
      imageUrl: imageUrl, 
    });

  } catch (error) {
    console.error('[Upload] ✗ Hata:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;