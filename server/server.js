require('dotenv').config();

const app = require('./app');

const port = 5001; 

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

