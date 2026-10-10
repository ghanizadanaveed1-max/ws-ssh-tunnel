const http = require('http');
const net = require('net');
const crypto = require('crypto');

const TARGETS = (process.env.TARGET_HOST || '').split(';').map(s => s.trim()).filter(Boolean);
const PORT = +process.env.TARGET_PORT || 22;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

http.createServer((_, res) => res.end('ok'))
  .on('upgrade', (req, socket, head) => {
    const n = parseInt(req.url.replace(/\D/g, '')) || 1;
    const host = TARGETS[n - 1] || TARGETS[0];
    const key = req.headers['sec-websocket-key'];
    let h = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n';
    if (key) h += 'Sec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + GUID).digest('base64') + '\r\n';
    socket.write(h + '\r\n');

    const tcp = net.connect(PORT, host);
    if (head.length) tcp.write(head);
    socket.pipe(tcp);
    tcp.pipe(socket);
    socket.on('error', () => tcp.destroy());
    tcp.on('error', () => socket.destroy());
    socket.on('close', () => tcp.destroy());
    tcp.on('close', () => socket.destroy());
  })
  .listen(process.env.PORT || 8080);
