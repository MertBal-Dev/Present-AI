const express = require('express');
const cors = require('cors');
const path = require('path');

const generateContentRouter = require('./routes/generateContent');
const searchImageRouter = require('./routes/searchImage');
const pdfRouter = require('./routes/pdfRoute');
const pptxRouter = require('./routes/pptxRoute');
const uploadRouter = require('./routes/uploadRoute');

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  'https://present-ai-suet.vercel.app', 
  'http://localhost:3000'                 
];

const corsOptions = {
  origin: function (origin, callback) {

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bu kaynağın erişimine CORS tarafından izin verilmiyor.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));


// --- MIDDLEWARE ---

app.use(express.json({ limit: '10mb' }));


// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});


// --- ROUTES ---
app.use('/api', generateContentRouter);
app.use('/api', searchImageRouter);
app.use('/api', pdfRouter);
app.use('/api', pptxRouter);
app.use('/api', uploadRouter);



app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});


app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

module.exports = app;