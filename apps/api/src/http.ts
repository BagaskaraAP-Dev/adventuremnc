import type { IncomingMessage, ServerResponse } from 'node:http';
import { CloudError, CloudStore } from './cloud';
import { RedisSaveRepository } from './storage';

let productionStore: CloudStore | undefined;
export function getProductionStore(): CloudStore {
  if (productionStore) return productionStore;
  const url = process.env['UPSTASH_REDIS_REST_URL'] ?? process.env['KV_REST_API_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'] ?? process.env['KV_REST_API_TOKEN'];
  if (!url || !token) throw new CloudError('Cloud storage is not configured', 503);
  productionStore = new CloudStore(new RedisSaveRepository(url, token));
  return productionStore;
}

type ApiRequest = IncomingMessage & { body?: unknown };
async function readBody(request: ApiRequest): Promise<unknown> {
  if (Number(request.headers['content-length'] ?? 0) > 4096) throw new CloudError('Payload too large', 413);
  // Vercel parses JSON bodies before invoking Node handlers; local HTTP uses the stream.
  if (request.body !== undefined) {
    const encoded = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    if (Buffer.byteLength(encoded) > 4096) throw new CloudError('Payload too large', 413);
    return JSON.parse(encoded) as unknown;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > 4096) throw new CloudError('Payload too large', 413);
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export async function handleCloudRequest(request: ApiRequest, response: ServerResponse, route: 'session' | 'save', storeFactory = getProductionStore): Promise<void> {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const allowed = route === 'session' ? ['POST'] : ['GET', 'POST'];
    if (!allowed.includes(request.method ?? '')) {
      response.setHeader('Allow', allowed.join(', '));
      throw new CloudError('Method not allowed', 405);
    }
    if (route === 'session') {
      response.statusCode = 201;
      response.end(JSON.stringify(await storeFactory().create()));
      return;
    }
    const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? '');
    if (!match?.[1]) throw new CloudError('Invalid session', 401);
    const token = match[1];
    const store = storeFactory();
    const state = request.method === 'GET' ? await store.get(token) : await store.command(token, await readBody(request));
    response.end(JSON.stringify(state));
  } catch (error) {
    response.statusCode = error instanceof CloudError ? error.status : error instanceof SyntaxError ? 400 : 503;
    response.end(JSON.stringify({ error: error instanceof CloudError ? error.message : response.statusCode === 400 ? 'Invalid JSON' : 'Cloud temporarily unavailable' }));
  }
}
