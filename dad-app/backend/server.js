const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log("ENV PATH:", path.join(__dirname, '.env'));

const express = require('express');
const cors = require('cors');
const diagnoseRoutes = require('./src/routes/diagnoseRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', diagnoseRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'D.A.D. API is running' });
});

app.listen(PORT, HOST, () => {
  console.log(`D.A.D. backend listening on http://${HOST}:${PORT}`);
});
