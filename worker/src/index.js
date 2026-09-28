const API = 'https://api.pluggy.ai';
let cachedApiKey = null;
let apiKeyExpiresAt = 0;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  });
}

async function firebaseUser(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('UNAUTHENTICATED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
  });
  const body = await response.json().catch(() => ({}));
  const uid = body.users?.[0]?.localId;
  if (!response.ok || !uid) throw new Error('UNAUTHENTICATED');
  return uid;
}

async function apiKey(env) {
  if (cachedApiKey && Date.now() < apiKeyExpiresAt) return cachedApiKey;
  const response = await fetch(`${API}/auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.apiKey) throw new Error('PLUGGY_UNAVAILABLE');
  cachedApiKey = body.apiKey;
  apiKeyExpiresAt = Date.now() + 105 * 60 * 1000;
  return cachedApiKey;
}

async function pluggy(path, env, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': await apiKey(env), ...(init.headers || {}) },
  });
  return response;
}

function itemIdFrom(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(value)) throw new Error('INVALID_ITEM');
  return value;
}

async function ownedMeuPluggyItem(itemId, uid, env) {
  const response = await pluggy(`/items/${encodeURIComponent(itemId)}`, env);
  const item = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('ITEM_NOT_FOUND');
  if (item.clientUserId !== uid || item.connector?.name !== 'MeuPluggy') throw new Error('FORBIDDEN_ITEM');
  return item;
}

async function accountsFor(itemId, env) {
  const response = await pluggy(`/accounts?itemId=${encodeURIComponent(itemId)}`, env);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('PLUGGY_UNAVAILABLE');
  return body.results || [];
}

function publicAccounts(accounts) {
  return accounts.map((account) => ({
    id: account.id,
    name: account.marketingName || account.name || 'Conta bancária',
    type: account.type || null,
    subtype: account.subtype || null,
    number: account.number || null,
    balance: typeof account.balance === 'number' ? account.balance : null,
    currencyCode: account.currencyCode || 'BRL',
    status: account.status || null,
  }));
}

async function route(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== env.ALLOWED_ORIGIN) return json({ error: 'Origem não autorizada.' }, 403, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env) });
  const uid = await firebaseUser(request, env);
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/connect-token') {
    const response = await pluggy('/connect_token', env, {
      method: 'POST',
      body: JSON.stringify({ options: { clientUserId: uid, avoidDuplicates: true } }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.accessToken) throw new Error('PLUGGY_UNAVAILABLE');
    return json({ accessToken: body.accessToken }, 200, env);
  }

  if (request.method === 'POST' && url.pathname === '/item') {
    const itemId = itemIdFrom((await request.json()).itemId);
    const item = await ownedMeuPluggyItem(itemId, uid, env);
    const accounts = await accountsFor(itemId, env);
    return json({
      item: { id: item.id, institution: item.connector.name, status: item.status, lastUpdatedAt: item.lastUpdatedAt || null, consentExpiresAt: item.consentExpiresAt || null },
      accounts: publicAccounts(accounts),
    }, 200, env);
  }

  if (request.method === 'DELETE' && url.pathname === '/item') {
    const itemId = itemIdFrom((await request.json()).itemId);
    await ownedMeuPluggyItem(itemId, uid, env);
    const response = await pluggy(`/items/${encodeURIComponent(itemId)}`, env, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error('PLUGGY_UNAVAILABLE');
    return json({ ok: true }, 200, env);
  }

  if (request.method === 'GET' && url.pathname === '/transactions') {
    const itemId = itemIdFrom(url.searchParams.get('itemId'));
    const accountId = itemIdFrom(url.searchParams.get('accountId'));
    await ownedMeuPluggyItem(itemId, uid, env);
    const accounts = await accountsFor(itemId, env);
    if (!accounts.some((account) => account.id === accountId)) throw new Error('FORBIDDEN_ACCOUNT');
    const next = url.searchParams.get('next');
    if (next) {
      const cursor = new URLSearchParams(next.slice(1));
      if (!next.startsWith('?') || cursor.get('accountId') !== accountId || !cursor.get('after') || next.length > 4096) {
        throw new Error('INVALID_CURSOR');
      }
    }
    const path = next ? `/v2/transactions${next}` : `/v2/transactions?accountId=${encodeURIComponent(accountId)}`;
    const response = await pluggy(path, env);
    if (!response.ok) throw new Error('PLUGGY_UNAVAILABLE');
    return new Response(response.body, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) } });
  }

  return json({ error: 'Rota não encontrada.' }, 404, env);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      const messages = {
        UNAUTHENTICATED: ['Entre novamente para sincronizar.', 401],
        INVALID_ITEM: ['Conexão bancária inválida.', 400],
        INVALID_CURSOR: ['Página de transações inválida.', 400],
        ITEM_NOT_FOUND: ['Conexão bancária não encontrada.', 404],
        FORBIDDEN_ITEM: ['Esta conexão não pertence à sua conta.', 403],
        FORBIDDEN_ACCOUNT: ['Esta conta não pertence à conexão.', 403],
        PLUGGY_UNAVAILABLE: ['Não foi possível consultar o Meu Pluggy agora.', 503],
      };
      const [message, status] = messages[error.message] || ['Não foi possível concluir a operação.', 500];
      return json({ error: message }, status, env);
    }
  },
};
