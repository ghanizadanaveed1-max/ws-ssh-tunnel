const http = require('http');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

const T = (process.env.TARGET_HOST || '').split(';').map(s => s.trim()).filter(Boolean);
const SSH = +process.env.SSH_PORT || 22;
const V2 = +process.env.V2_PORT || 44501;
const SNI = process.env.V2_SNI || 'youtube.com';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

http.createServer((_, res) => res.end('ok'))
  .on('upgrade', (req, socket, head) => {
    const m = req.url.match(/^\/(\d+)(?::(\d+))?(\/.*)?$/);
    const n = m ? +m[1] : 1;
    const port = m && m[2] ? +m[2] : V2;
    const rest = m && m[3] ? m[3] : '';
    const host = T[n - 1] || T[0];

    let up;
    if (rest) {
      up = tls.connect({ host, port, servername: SNI, rejectUnauthorized: false });
      let raw = `${req.method} ${rest} HTTP/1.1\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2)
        raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      up.write(raw + '\r\n');
    } else {
      up = net.connect(SSH, host);
      const key = req.headers['sec-websocket-key'];
      let h = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n';
      if (key) h += 'Sec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + GUID).digest('base64') + '\r\n';
      socket.write(h + '\r\n');
    }
    if (head.length) up.write(head);

    socket.pipe(up);
    up.pipe(socket);
    socket.on('error', () => up.destroy());
    up.on('error', () => socket.destroy());
    socket.on('close', () => up.destroy());
    up.on('close', () => socket.destroy());
  })
  .listen(process.env.PORT || 8080);
