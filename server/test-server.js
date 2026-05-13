const http = require('http');

console.log('🧪 TEST SERVER STARTING');

const server = http.createServer((req, res) => {
  console.log(`📍 Request: ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`✅ TEST SERVER LISTENING ON PORT ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
