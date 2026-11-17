// Servidor local para testar o app sem instalar o Netlify CLI.
// Imita o Netlify: serve a pasta public/, roda as funções de netlify/functions e um Netlify Blobs local.
//
//   node scripts/servidor-local.mjs            → http://localhost:8888
//
// Variáveis (opcionais): ANTHROPIC_API_KEY, APP_ACCESS_CODE (padrão: schay-teste),
// ADMIN_CODE (padrão: gestor-teste), SUPPORT_WHATSAPP, PORTA, PASTA_BLOBS (onde gravar os dados locais).
// Sem ANTHROPIC_API_KEY, IA_FALSA=1 devolve uma resposta de exemplo (só para testar as telas).
import http from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publico = path.join(raiz, "public");
const porta = Number(process.env.PORTA) || 8888;

process.env.APP_ACCESS_CODE ||= "schay-teste";
process.env.ADMIN_CODE ||= "gestor-teste";
process.env.SUPPORT_WHATSAPP ||= "5551999999999";
globalThis.Netlify = { env: { get: (nome) => process.env[nome] } };

// Netlify Blobs local (grava em .netlify/blobs-local)
const pastaBlobs = process.env.PASTA_BLOBS || path.join(raiz, ".netlify", "blobs-local");
await mkdir(pastaBlobs, { recursive: true });
const blobs = new BlobsServer({ directory: pastaBlobs, token: "local" });
const { port: portaBlobs } = await blobs.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
  JSON.stringify({ siteID: "local", token: "local", edgeURL: `http://localhost:${portaBlobs}`, uncachedEdgeURL: `http://localhost:${portaBlobs}` }),
).toString("base64");

// Gera o módulo do playbook e carrega as funções
await import(pathToFileURL(path.join(raiz, "scripts", "gerar-cerebro.mjs")).href);
const funcoes = [];
for (const nome of ["responder", "clientes", "gestor", "config"]) {
  const mod = await import(pathToFileURL(path.join(raiz, "netlify", "functions", `${nome}.mts`)).href);
  funcoes.push({ caminho: mod.config.path, metodos: [].concat(mod.config.method || []), executar: mod.default });
}

const REDIRECIONAR = { "/relatorio": "/relatorio.html", "/gestor": "/relatorio.html", "/instalar": "/instalar.html" };
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
};
const CABECALHOS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

function respostaFalsa(corpo) {
  const retomar = corpo?.modo === "retomar";
  return {
    ok: true,
    resultado: {
      cliente: { nome: retomar ? null : "Mariana", telefone: retomar ? null : "51988887777" },
      imovel_id: corpo?.imovelId || "exemplo-apto-centro",
      momento: retomar ? "sumiu" : "primeiro_contato",
      etapa: "novo",
      temperatura: "frio",
      leitura: "Quer saber o preço; ainda não sabemos se é pra morar ou investir.",
      respostas: [
        { tipo: "texto", texto: retomar ? "Oi! Passando pra te contar que o apê tem sacada com churrasqueira 😊 Ainda faz sentido pra você?" : "Oi, Mariana! Obrigada pelo contato 😊 Ele está R$ 289 mil. Pra eu te ajudar melhor: você procura pra morar ou pra investir?" },
        { tipo: "audio", texto: "Oi, Mariana! Aqui é a Schay, da Innovar. Vi que você se interessou pelo apartamento. Me conta: é pra você morar? Assim eu te passo os detalhes que fazem diferença pra você." },
      ],
      proximo_passo: "Descobrir se é pra morar ou investir",
      followup: { precisa: true, dias: 1, hora: "10:00", quando: "amanhã às 10h", mensagem: "Oi, Mariana! Conseguiu ver minha mensagem sobre o apê? Se quiser, te mando mais fotos 😊" },
      por_que: "Responder o preço e já devolver uma pergunta mantém a conversa viva.",
      resumo: "Perguntou o preço do apartamento do anúncio.",
      hora_primeira_mensagem_hoje: null,
      pediu_para_parar: false,
    },
  };
}

async function lerCorpo(req) {
  const partes = [];
  for await (const p of req) partes.push(p);
  return Buffer.concat(partes);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${porta}`);
  try {
    const funcao = funcoes.find((f) => f.caminho === url.pathname);
    if (funcao) {
      const corpo = ["GET", "HEAD"].includes(req.method) ? undefined : await lerCorpo(req);
      if (funcao.caminho === "/api/responder" && !process.env.ANTHROPIC_API_KEY && process.env.IA_FALSA === "1") {
        await new Promise((r) => setTimeout(r, 1800));
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(respostaFalsa(JSON.parse(corpo.toString() || "{}"))));
      }
      const pedido = new Request(url, { method: req.method, headers: req.headers, body: corpo });
      const resposta = await funcao.executar(pedido, { ip: req.socket.remoteAddress, params: {} });
      res.writeHead(resposta.status, Object.fromEntries(resposta.headers));
      return res.end(Buffer.from(await resposta.arrayBuffer()));
    }
    let caminho = REDIRECIONAR[url.pathname] || (url.pathname === "/" ? "/index.html" : url.pathname);
    const arquivo = path.join(publico, path.normalize(caminho).replace(/^(\.\.[/\\])+/, ""));
    if (!arquivo.startsWith(publico) || !(await stat(arquivo).catch(() => null))?.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end("Não encontrado");
    }
    res.writeHead(200, { ...CABECALHOS, "content-type": TIPOS[path.extname(arquivo)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(await readFile(arquivo));
  } catch (erro) {
    console.error(erro);
    res.writeHead(500);
    res.end("erro");
  }
});

servidor.listen(porta, () => {
  console.log(`Copiloto rodando em http://localhost:${porta}/?c=${process.env.APP_ACCESS_CODE}`);
  console.log(`Painel do gestor: http://localhost:${porta}/relatorio (código: ${process.env.ADMIN_CODE})`);
  if (!process.env.ANTHROPIC_API_KEY) console.log(process.env.IA_FALSA === "1" ? "IA de mentira ligada (IA_FALSA=1)." : "Sem ANTHROPIC_API_KEY: o botão de gerar resposta vai mostrar erro.");
});
