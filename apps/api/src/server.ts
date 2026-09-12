import { createServer } from 'node:http';
import { CloudStore } from './cloud';
const store = new CloudStore(process.env['SAVE_DIRECTORY'] ?? './saves');
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST' && req.url === '/api/session') {
      res.end(JSON.stringify(await store.create()));
      return;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    if (req.url !== '/api/save') { res.writeHead(404).end('{}'); return; }
    if (req.method === 'GET') { res.end(JSON.stringify(await store.get(token))); return; }
    if (req.method !== 'POST') { res.writeHead(405).end('{}'); return; }
    let body = '';
    for await (const chunk of req) {
      body += String(chunk);
      if (body.length > 4096) { res.writeHead(413).end('{}'); return; }
    }
    const input: unknown = JSON.parse(body);
    res.end(JSON.stringify(await store.command(token, input)));
  } catch {
    res.writeHead(400).end(JSON.stringify({ error: 'Save rejected: invalid session, command, or mission conditions' }));
  }
});
server.listen(Number(process.env['PORT'] ?? 3001), '127.0.0.1');
