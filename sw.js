/* CIBO 선결재 장부 - 오프라인 지원 (서비스 워커)
   처음 한 번 인터넷으로 열면 프로그램 파일을 휴대폰에 저장해 두고,
   그 뒤로는 인터넷 없이도 열립니다. 인터넷이 되면 뒤에서 새 버전을 받아
   다음 실행부터 반영합니다. (장부 데이터는 여기서 다루지 않음) */
const CACHE = 'cibo-ledger-v1.7';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const network = fetch(req).then(res => {
    if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => null);
  e.waitUntil(network.then(() => {}));

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    let cached = await c.match(req, {ignoreSearch: true});
    if (!cached && req.mode === 'navigate') cached = await c.match('./index.html') || await c.match('./');
    if (cached) return cached;
    const res = await network;
    return res || new Response('인터넷에 연결된 상태에서 한 번 열어 주세요.', {
      status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
    });
  })());
});
