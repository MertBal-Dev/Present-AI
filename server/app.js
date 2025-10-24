const express = require('express');
const cors = require('cors');

const generateContentRouter = require('./routes/generateContent');
const searchImageRouter = require('./routes/searchImage');

const pdfRouter = require('./routes/pdfRoute');
const pptxRouter = require('./routes/pptxRoute');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- HEALTH ---
app.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// --- ROUTES ---
app.use('/api', generateContentRouter);
app.use('/api', searchImageRouter);
app.use('/api', pdfRouter);
app.use('/api', pptxRouter);

module.exports = app;
