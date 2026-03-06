import fs from 'fs';
import path from 'path';

const DB_FILE = './memory.json';
let localCache: Record<string, any[]> = {};

try {
  if (fs.existsSync(DB_FILE)) {
    localCache = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }
} catch (e) {
  console.log('No se pudo leer memory.json inicial');
}

export async function getMessages(sessionId: string) {
  return localCache[sessionId] || [];
}

export async function saveMessage(sessionId: string, messageObj: any) {
  if (!localCache[sessionId]) {
    localCache[sessionId] = [];
  }
  localCache[sessionId].push(messageObj);

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localCache, null, 2));
  } catch (error) {
    console.error(`Error guardando mensaje local:`, error);
  }
}
