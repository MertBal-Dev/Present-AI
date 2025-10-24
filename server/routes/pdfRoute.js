const express = require('express');
const router = express.Router();
const { buildPDF } = require('../services/pdfService');

router.post('/download-pdf', async (req, res) => {
  try {
    const { presentationData, theme: themeName } = req.body;
    const buffer = await buildPDF(presentationData, themeName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sunum.pdf"');
    res.send(buffer);
  } catch (error) {
    console.error('PDF oluşturulurken hata oluştu:', error);
    res.status(500).json({ error: 'PDF dosyası oluşturulamadı.' });
  }
});

module.exports = router;
