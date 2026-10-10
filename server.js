const http = require('http');
const net = require('net');
const crypto = require('crypto');

const T = (process.env.TARGET_HOST || '').split(';').map(s => s.trim()).filter(Boolean);
const SSH = +process.env.SSH_PORT || 22;
const V2 = +process.env.V2_PORT || 80;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

http.createServer((_, res) => res.end('ok'))
  .on('upgrade', (req, socket, head) => {
    const m = req.url.match(/^\/(\d+)(\/.*)?$/);
    const n = m ? +m[1] : 1;
    const rest = m && m[2] ? m[2] : '';
    const host = T[n - 1] || T[0];
    const tcp = net.connect(rest ? V2 : SSH, host);

    if (rest) {
      let raw = `${req.method} ${rest} HTTP/1.1\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2)
        raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      tcp.write(raw + '\r\n');
    } else {
      const key = req.headers['sec-websocket-key'];
      let h = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n';
      if (key) h += 'Sec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + GUID).digest('base64') + '\r\n';
      socket.write(h + '\r\n');
    }
    if (head.length) tcp.write(head);

    socket.pipe(tcp);
    tcp.pipe(socket);
    socket.on('error', () => tcp.destroy());
    tcp.on('error', () => socket.destroy());
    socket.on('close', () => tcp.destroy());
    tcp.on('close', () => socket.destroy());
  })
  .listen(process.env.PORT || 8080);
