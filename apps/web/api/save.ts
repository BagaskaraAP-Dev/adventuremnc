import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCloudRequest } from '@adventuremnc/api/http';
export default function save(request: IncomingMessage, response: ServerResponse): Promise<void> {
  return handleCloudRequest(request, response, 'save');
}
