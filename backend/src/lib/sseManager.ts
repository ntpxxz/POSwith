import { Response } from 'express';

interface SseClient {
  id: string;
  res: Response;
  userId: number;
}

const clients = new Map<string, SseClient>();

export function addClient(clientId: string, res: Response, userId: number) {
  clients.set(clientId, { id: clientId, res, userId });
}

export function removeClient(clientId: string) {
  clients.delete(clientId);
}

export function broadcastEvent(event: string, data: unknown) {
  const payload = JSON.stringify(data);
  for (const client of clients.values()) {
    client.res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }
}

export function sendHeartbeat() {
  for (const client of clients.values()) {
    client.res.write(':heartbeat\n\n');
  }
}

export function getClientCount() {
  return clients.size;
}
