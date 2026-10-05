/* Service worker do treino do Endrew.
   Fica na pasta /avalia-o/endrew/sw.js */
const CACHE = 'endrew-treino-v1';
const TIMEOUT = 3500; // se a internet estiver lenta, abre a cópia guardada em vez de esperar

// endereço "padrão" da página (sem ?busca e #trecho, sempre com barra no final)
const key = u => {
  const x = new URL(u);
  x.search = ''; x.hash = '';
  if (!/\.[a-z0-9]+$/i.test(x.pathname) && !x.pathname.endsWith('/')) x.pathname += '/';
  return x.href;
};

// respostas que vieram de redirecionamento não podem ser entregues direto ao navegador
const clean = async r => r.redirected
  ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers })
  : r;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const n of await caches.keys()) {
    if (n.startsWith('endrew-treino-') && n !== CACHE) await caches.delete(n);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  
  // Filtra apenas para a sua pasta do Endrew
  if (u.origin !== location.origin || !u.pathname.includes('/endrew/')) return; 
  
  e.respondWith(handle(r));
});

// Internet primeiro (ficha sempre atualizada); se falhar ou demorar, usa a cópia guardada.
async function handle(r) {
  const cache = await caches.open(CACHE);
  const k = key(r.url);
  const hit = await cache.match(k);
  const net = fetch(r.url, { cache: 'no-cache' }).then(async res => {
    const fin = await clean(res);
    if (fin.ok) { await cache.put(k, fin.clone()); return fin; }
    return hit || fin;
  });
  if (!hit) return net;
  net.catch(() => {});
  return Promise.race([net, new Promise(ok => setTimeout(() => ok(hit), TIMEOUT))]).catch(() => hit);
}
