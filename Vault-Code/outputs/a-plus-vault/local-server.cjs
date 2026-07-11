const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const serverHost = process.env.VAULT_HOST || '127.0.0.1';
const serverPort = Number(process.env.VAULT_PORT || 5177);
const dataDir = process.env.VAULT_DATA_DIR
  ? path.resolve(process.env.VAULT_DATA_DIR)
  : path.join(root, 'data');
const capturesFile = path.join(dataDir, 'vault-captures.json');
const collectionsFile = path.join(dataDir, 'vault-extension-collections.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.svg': 'image/svg+xml'
};

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(capturesFile)) fs.writeFileSync(capturesFile, '[]', 'utf8');
}

function readCaptures() {
  ensureDataFile();
  try {
    const rows = JSON.parse(fs.readFileSync(capturesFile, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeCaptures(rows) {
  ensureDataFile();
  fs.writeFileSync(capturesFile, JSON.stringify(rows, null, 2), 'utf8');
}

function bearerFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

function hashBearer(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function scopeFromToken(token) {
  const userMatch = /^vault-user-([0-9a-f-]{36})$/i.exec(token || '');
  if (userMatch) return hashBearer(userMatch[1]);
  return hashBearer(token);
}

function readAllCollections() {
  ensureDataFile();
  try {
    const rows = JSON.parse(fs.readFileSync(collectionsFile, 'utf8'));
    return rows && typeof rows === 'object' ? rows : {};
  } catch {
    return {};
  }
}

function writeAllCollections(rows) {
  ensureDataFile();
  fs.writeFileSync(collectionsFile, JSON.stringify(rows, null, 2), 'utf8');
}

function readCollectionsForToken(token) {
  const scope = scopeFromToken(token);
  const all = readAllCollections();
  return Array.isArray(all[scope]) ? all[scope] : [];
}

function upsertCollectionForToken(token, collection) {
  const scope = scopeFromToken(token);
  const all = readAllCollections();
  const list = Array.isArray(all[scope]) ? all[scope].slice() : [];
  const idx = list.findIndex(row => row.id === collection.id);
  if (idx >= 0) list[idx] = collection;
  else list.push(collection);
  all[scope] = list;
  writeAllCollections(all);
  return collection;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024 * 2) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function readBodyBuffer(req, limit = 1024 * 1024 * 12) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function hasBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') && header.slice(7).trim().length > 0;
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanUrl(value) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:', 'data:', 'blob:'].includes(url.protocol)) return '';
    return raw;
  } catch {
    return raw.startsWith('upload://') ? raw : '';
  }
}

function host(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function inferColors(seed) {
  const value = seed.toLowerCase();
  if (value.includes('coral') || value.includes('red')) return ['#ff4f43', '#2f3133', '#ffffff'];
  if (value.includes('interior') || value.includes('material')) return ['#d6c7b7', '#f8f6f2', '#9aa5a7', '#c56b4e'];
  if (value.includes('black') || value.includes('dark')) return ['#17191b', '#2f3133', '#ffffff'];
  return ['#ffffff', '#2f3133', '#ff4f43', '#e7e9ec'];
}

function analyzeLite(item, rawType) {
  const sourceHost = host(item.sourceUrl);
  const context = item.captureContext || {};
  const quickTags = Array.isArray(context.quickTags) ? context.quickTags : [];
  const tags = new Set([item.type === 'note' ? 'thought' : item.type, 'extension capture']);
  if (rawType === 'page') tags.add('saved page');
  if (rawType === 'text') tags.add('selected text');
  if (rawType === 'video') tags.add('motion reference');
  if (sourceHost) tags.add(sourceHost);
  quickTags.forEach(tag => tags.add(tag));
  if (context.visualCategory) tags.add(context.visualCategory);
  return {
    tags: Array.from(tags).slice(0, 8),
    category: context.visualCategory || '',
    colors: inferColors(`${item.title} ${item.note} ${item.sourceUrl}`).slice(0, 5),
    ocrText: item.type === 'note'
      ? item.note
      : rawType === 'image'
        ? 'Image captured from browser extension.'
        : rawType === 'video'
          ? 'Video metadata captured from browser extension.'
          : 'Metadata captured from browser extension.',
    summary: item.type === 'image'
      ? 'Image reference kept from the browser extension.'
      : item.type === 'video'
        ? 'Video reference kept from the browser extension for motion and mood direction.'
      : item.type === 'link'
        ? `Saved source${sourceHost ? ` from ${sourceHost}` : ''} via browser extension.`
        : 'Selected text kept from the browser extension.'
  };
}

function buildVaultItem(payload) {
  const context = payload.captureContext && typeof payload.captureContext === 'object'
    ? payload.captureContext
    : {};
  const rawType = text(payload.type).toLowerCase();
  const type = rawType === 'image' ? 'image' : rawType === 'video' ? 'video' : rawType === 'link' || rawType === 'page' ? 'link' : 'note';
  const pageTitle = text(context.pageTitle);
  const pageUrl = cleanUrl(context.pageUrl);
  const sourceUrl = cleanUrl(payload.sourceUrl) || pageUrl || cleanUrl(context.linkUrl) || cleanUrl(context.videoUrl);
  const previewUrl = cleanUrl(payload.previewUrl) || cleanUrl(payload.thumbnailUrl) || cleanUrl(context.imageUrl) || cleanUrl(context.ogImage) || cleanUrl(context.twitterImage);
  const thumbnailUrl = cleanUrl(payload.thumbnailUrl) || previewUrl;
  const assetUrl = type === 'image'
    ? cleanUrl(payload.assetUrl) || cleanUrl(context.imageUrl) || previewUrl
    : type === 'video'
      ? cleanUrl(payload.assetUrl) || cleanUrl(context.videoUrl) || sourceUrl
      : cleanUrl(payload.assetUrl) || '';
  const note = type === 'note'
    ? text(payload.note) || text(context.selectionText)
    : text(payload.note);
  let title = text(payload.title);
  if (!title && rawType === 'text') title = note.slice(0, 54) || 'Saved text';
  if (!title && rawType === 'page') title = pageTitle || host(sourceUrl) || 'Saved page';
  if (!title && type === 'link') title = host(sourceUrl) || 'Saved link';
  if (!title && type === 'image') title = pageTitle || 'Saved image';
  if (!title && type === 'video') title = pageTitle || host(sourceUrl) || 'Saved video';
  const requestedCollection = text(payload.collectionId);
  const quickTags = quickTagsFrom(payload.quickKeywords || context.quickKeywords);
  const visualCategory = text(payload.visualCategory || context.visualCategory);

  const item = {
    id: makeId(),
    type,
    title,
    note,
    sourceUrl,
    assetUrl,
    previewUrl,
    thumbnailUrl,
    mimeType: text(payload.mimeType),
    fileName: text(payload.fileName),
    fileExtension: text(payload.fileExtension),
    collectionIds: [requestedCollection || 'all'],
    projectIds: text(payload.projectId) ? [text(payload.projectId)] : [],
    status: 'ready',
    createdAt: Date.now(),
    captureContext: {
      method: text(context.method) || `extension_${rawType || type}`,
      pageTitle: pageTitle || null,
      pageUrl: pageUrl || null,
      selectionText: text(context.selectionText) || null,
      imageUrl: cleanUrl(context.imageUrl) || (type === 'image' ? assetUrl : null),
      videoUrl: cleanUrl(context.videoUrl) || (type === 'video' ? assetUrl : null),
      linkUrl: cleanUrl(context.linkUrl) || sourceUrl || null,
      previewUrl: previewUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      mimeType: text(payload.mimeType) || null,
      fileName: text(payload.fileName) || null,
      fileExtension: text(payload.fileExtension) || null,
      destination: 'Vault Library',
      rawType: rawType || type,
      quickTags,
      visualCategory: visualCategory || null,
      usageNote: text(context.usageNote) || 'Private reference only'
    }
  };
  item.analysis = analyzeLite(item, rawType);
  return item;
}

function quickTagsFrom(value) {
  return text(value)
    .split(/[,\n]/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function duplicateKeys(item) {
  const context = item?.captureContext || {};
  return [
    item?.sourceUrl,
    item?.assetUrl,
    item?.previewUrl,
    item?.thumbnailUrl,
    context.imageUrl,
    context.linkUrl,
    context.pageUrl,
    context.videoUrl
  ].map(canonicalRef).filter(Boolean);
}

function canonicalRef(value) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    return parsed.href;
  } catch (_) {
    return raw;
  }
}

function findDuplicateCapture(item, rows) {
  const keys = duplicateKeys(item);
  if (!keys.length) return null;
  return (rows || []).find(row => {
    const existing = row?.item || row;
    return duplicateKeys(existing).some(key => keys.includes(key));
  }) || null;
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=([^;]+)/i.exec(contentType || '');
  if (!match) throw new Error('Missing multipart boundary.');
  const boundary = `--${match[1].replace(/^"|"$/g, '')}`;
  const textBody = buffer.toString('latin1');
  const result = {};

  textBody.split(boundary).forEach(part => {
    if (!part || part === '--\r\n' || part === '--') return;
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const rawHeaders = part.slice(0, headerEnd);
    let rawBody = part.slice(headerEnd + 4);
    rawBody = rawBody.replace(/\r\n--$/, '').replace(/\r\n$/, '');

    const nameMatch = /name="([^"]+)"/i.exec(rawHeaders);
    if (!nameMatch) return;

    const name = nameMatch[1];
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
    const filenameMatch = /filename="([^"]*)"/i.exec(rawHeaders);
    const valueBuffer = Buffer.from(rawBody, 'latin1');

    if (filenameMatch) {
      result[name] = {
        filename: filenameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        buffer: valueBuffer
      };
      return;
    }

    result[name] = valueBuffer.toString('utf8');
  });

  return result;
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return true;
  }

  if (url.pathname === '/api/vault/captures' && req.method === 'GET') {
    sendJson(res, 200, { success: true, items: readCaptures() });
    return true;
  }

  if (url.pathname === '/api/vault/health' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      service: 'a-plus-vault-local',
      storage: 'local',
      captures: readCaptures().length
    });
    return true;
  }

  if (url.pathname === '/api/vault/capture' && req.method === 'POST') {
    if (!hasBearerToken(req)) {
      sendJson(res, 401, { success: false, message: 'Missing Vault token.' });
      return true;
    }

    try {
      const payload = JSON.parse(await readBody(req) || '{}');
      const item = buildVaultItem(payload);
      const existingRows = readCaptures();
      const duplicate = findDuplicateCapture(item, existingRows);
      const record = {
        objectId: item.id,
        item,
        payload,
        createdAt: new Date().toISOString()
      };
      const rows = [record].concat(existingRows).slice(0, 500);
      writeCaptures(rows);
      sendJson(res, 200, {
        success: true,
        duplicateOf: duplicate ? duplicate.objectId || duplicate.item?.id || null : null,
        objectId: item.id,
        type: item.type,
        title: item.title,
        sourceUrl: item.sourceUrl,
        previewUrl: item.previewUrl || item.assetUrl || null,
        thumbnailUrl: item.thumbnailUrl || item.previewUrl || null,
        objectUrl: `/vault#object=${encodeURIComponent(item.id)}`,
        createdAt: new Date(item.createdAt).toISOString(),
        message: 'Saved to Vault Library',
        item
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: error.message || 'Could not save this object.'
      });
    }
    return true;
  }

  if (url.pathname === '/api/vault/capture-file' && req.method === 'POST') {
    if (!hasBearerToken(req)) {
      sendJson(res, 401, { success: false, message: 'Missing Vault token.' });
      return true;
    }

    try {
      const parts = parseMultipart(await readBodyBuffer(req), req.headers['content-type'] || '');
      const file = parts.file;
      const payload = JSON.parse(parts.payload || '{}');
      if (!file || !file.buffer || !file.buffer.length) throw new Error('Missing snapshot file.');

      const contentType = file.contentType || 'image/png';
      const assetUrl = `data:${contentType};base64,${file.buffer.toString('base64')}`;
      payload.assetUrl = assetUrl;
      if (!payload.type || payload.captureContext?.method === 'extension_snapshot') payload.type = 'image';
      payload.captureContext = Object.assign({}, payload.captureContext || {}, {
        imageUrl: payload.type === 'image' ? assetUrl : payload.captureContext?.imageUrl || null
      });

      const item = buildVaultItem(payload);
      const existingRows = readCaptures();
      const duplicate = findDuplicateCapture(item, existingRows);
      const record = {
        objectId: item.id,
        item,
        payload: Object.assign({}, payload, { assetUrl: '[snapshot-file]' }),
        createdAt: new Date().toISOString()
      };
      const rows = [record].concat(existingRows).slice(0, 500);
      writeCaptures(rows);
      sendJson(res, 200, {
        success: true,
        duplicateOf: duplicate ? duplicate.objectId || duplicate.item?.id || null : null,
        objectId: item.id,
        type: item.type,
        title: item.title,
        sourceUrl: item.sourceUrl,
        previewUrl: assetUrl.length < 120000 ? assetUrl : null,
        objectUrl: `/vault#object=${encodeURIComponent(item.id)}`,
        createdAt: new Date(item.createdAt).toISOString(),
        message: 'Saved to Vault Library',
        item
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: error.message || 'Could not save this snapshot.'
      });
    }
    return true;
  }

  if (url.pathname === '/api/vault/collections' && req.method === 'GET') {
    const token = bearerFromRequest(req);
    if (!token) {
      sendJson(res, 401, { success: false, message: 'Missing Vault token.' });
      return true;
    }
    sendJson(res, 200, { success: true, collections: readCollectionsForToken(token) });
    return true;
  }

  if (url.pathname === '/api/vault/collections' && req.method === 'POST') {
    const token = bearerFromRequest(req);
    if (!token) {
      sendJson(res, 401, { success: false, message: 'Missing Vault token.' });
      return true;
    }

    try {
      const payload = JSON.parse(await readBody(req) || '{}');
      const id = text(payload.id);
      const name = text(payload.name);
      if (!name) throw new Error('Collection name is required.');
      if (!id || id === 'all') throw new Error('Collection id is required.');
      const collection = upsertCollectionForToken(token, { id, name, system: false });
      sendJson(res, 200, { success: true, collection });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: error.message || 'Could not save collection.'
      });
    }
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${serverHost}:${serverPort}`);
  if (await handleApi(req, res, url)) return;

  let file = decodeURIComponent(url.pathname || '/');
  if (file === '/demo' || file === '/demo.html') {
    res.writeHead(301, { Location: '/' });
    res.end();
    return;
  }
  // SPA routes: Vault app + Moodboard Phase 1 deep links
  // Do NOT use startsWith('/vault') — that incorrectly maps /vault-runtime.js → index.html
  if (
    file === '/' ||
    file === '/vault' ||
    file === '/vault/' ||
    file.startsWith('/vault/') ||
    file === '/objects' ||
    file.startsWith('/objects/') ||
    file === '/moodboards' ||
    file.startsWith('/moodboards/')
  ) {
    file = '/index.html';
  }

  const target = path.normalize(path.join(root, file));
  if (!target.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(serverPort, serverHost, () => {
  console.log(`A+ Vault local server: http://${serverHost}:${serverPort}`);
});
