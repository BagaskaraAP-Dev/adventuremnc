import { createServer } from 'node:http';
import { CloudStore } from './cloud';
import { handleCloudRequest } from './http';
const store = new CloudStore(process.env['SAVE_DIRECTORY'] ?? './saves');
const server = createServer(async (req, res) => {
  const path = req.url?.split('?')[0];
  if (path !== '/api/session' && path !== '/api/save') { res.writeHead(404).end('{}'); return; }
  await handleCloudRequest(req, res, path === '/api/session' ? 'session' : 'save', () => store);
});
server.listen(Number(process.env['PORT'] ?? 3001), '127.0.0.1');
