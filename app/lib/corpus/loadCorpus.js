import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const DOCUMENTS_DIR = path.join(PROCESSED_DIR, 'documents');
const CHUNKS_DIR = path.join(PROCESSED_DIR, 'chunks');

const CACHE_TTL_MS = 30_000;

let cache = null;
let cacheTimestamp = 0;

/**
 * Load the entire processed corpus into memory.
 * Results are cached and refreshed when files change or TTL expires.
 *
 * @returns {Promise<{ documents: Map<string, object>, chunks: object[] }>}
 */
export async function loadCorpus() {
  const now = Date.now();

  if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
    return cache;
  }

  const [documents, chunks] = await Promise.all([loadDocuments(), loadChunks()]);

  cache = { documents, chunks };
  cacheTimestamp = now;

  return cache;
}

/**
 * Force-clear the in-memory corpus cache.
 */
export function invalidateCorpusCache() {
  cache = null;
  cacheTimestamp = 0;
}

async function loadDocuments() {
  const map = new Map();

  let files;
  try {
    files = await readdir(DOCUMENTS_DIR);
  } catch {
    return map;
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const results = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const content = await readFile(path.join(DOCUMENTS_DIR, file), 'utf-8');
        return JSON.parse(content);
      } catch {
        return null;
      }
    }),
  );

  for (const doc of results) {
    if (doc && doc.id && doc.status !== 'error') {
      map.set(doc.id, doc);
    }
  }

  return map;
}

async function loadChunks() {
  let files;
  try {
    files = await readdir(CHUNKS_DIR);
  } catch {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const results = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const content = await readFile(path.join(CHUNKS_DIR, file), 'utf-8');
        return JSON.parse(content);
      } catch {
        return [];
      }
    }),
  );

  return results.flat().filter((chunk) => chunk && chunk.chunkId && chunk.text);
}
