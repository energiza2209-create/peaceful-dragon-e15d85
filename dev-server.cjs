/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MAX_PORT = DEFAULT_PORT + 10;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.sql': 'text/plain',
  '.ts': 'text/plain',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const filePath = path.join(ROOT, url);
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

function tryListen(port) {
  server.listen(port, () => {
    console.log('Servidor rodando em http://localhost:' + port);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < MAX_PORT) {
      tryListen(port + 1);
      return;
    }
    console.error('Erro ao iniciar servidor:', err.message);
    process.exit(1);
  });
}

tryListen(DEFAULT_PORT);
