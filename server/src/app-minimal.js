console.log('🚀 Minimal App Starting...');

require('dotenv').config();
console.log('✓ Loaded .env');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

console.log('✓ Express middleware configured');

// HTML + Static files
app.use('/', require('./routes/htmlAuth'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 8081;

if (require.main === module) {
  try {
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

module.exports = app;
