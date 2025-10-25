const express = require('express');
const cors = require('cors');
const path = require('path');

const generateContentRouter = require('./routes/generateContent');
const searchImageRouter = require('./routes/searchImage');
const pdfRouter = require('./routes/pdfRoute');
const pptxRouter = require('./routes/pptxRoute');
const uploadRouter = require('./routes/uploadRoute');

const app = express();

// --- MIDDLEWARE ---

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// --- HEALTH ---
app.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// --- ROUTES ---
app.use('/api', generateContentRouter);
app.use('/api', searchImageRouter);
app.use('/api', pdfRouter);
app.use('/api', pptxRouter);
app.use('/api', uploadRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

module.exports = app;