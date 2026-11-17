// Service worker: deixa o app abrir rápido e funcionar mesmo com internet fraca.
// Nunca guarda respostas da IA nem dados de clientes (/api/* passa direto).
const VERSAO = "copiloto-v1";
const ESSENCIAIS = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/imoveis.json",
  "/manifest.webmanifest",
  "/icones/icone.svg",
  "/icones/icone-192.png",
  "/fontes/nunito-latin.woff2",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Páginas: tenta a internet primeiro (pega a versão nova); sem internet, usa a guardada.
  if (pedido.mode === "navigate") {
    if (url.pathname !== "/" && url.pathname !== "/index.html") return; // relatório e instalar: sempre da internet
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put("/", copia));
          return resposta;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Arquivos do app: responde com o guardado e atualiza por trás.
  evento.respondWith(
    caches.open(VERSAO).then((cache) =>
      cache.match(pedido, { ignoreSearch: true }).then((guardado) => {
        const daRede = fetch(pedido)
          .then((resposta) => {
            if (resposta.ok) cache.put(pedido, resposta.clone());
            return resposta;
          })
          .catch(() => guardado);
        return guardado || daRede;
      }),
    ),
  );
});
