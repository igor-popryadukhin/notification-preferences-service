import { createApp } from '@/api/app';
import type { Server } from 'http';

let server: Server;
let baseUrl: string;

export async function startTestServer(): Promise<string> {
  const app = createApp();

  return new Promise((resolve, reject) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
        resolve(baseUrl);
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
  });
}

export async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

export function getBaseUrl(): string {
  return baseUrl;
}
