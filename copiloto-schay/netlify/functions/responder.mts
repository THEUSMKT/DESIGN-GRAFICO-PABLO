// POST /api/responder: recebe o print/texto da conversa e devolve a resposta sugerida.
// As imagens só passam por aqui a caminho do Claude: nada é gravado.
import type { Config, Context } from "@netlify/functions";
import { gerarResposta, ErroIA, type Entrada, type Imagem, type ClienteConhecido } from "../lib/cerebro.mts";
import { env, json, negado, papelDaRequisicao, passouDoLimite } from "../lib/seguranca.mts";

const TIPOS_IMAGEM = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGENS = 4;
const MAX_BASE64 = 3_000_000; // ~2,2 MB por imagem (o app já reduz para ~1500 px)

function lerEntrada(corpo: any): Entrada | string {
  const modo = corpo?.modo === "retomar" ? "retomar" : "conversa";

  const imagens: Imagem[] = [];
  if (Array.isArray(corpo?.imagens)) {
    if (corpo.imagens.length > MAX_IMAGENS) return "muitas_imagens";
    for (const img of corpo.imagens) {
      if (!TIPOS_IMAGEM.has(img?.tipo) || typeof img?.dados !== "string") return "imagem_invalida";
      if (img.dados.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(img.dados)) return "imagem_invalida";
      imagens.push({ tipo: img.tipo, dados: img.dados });
    }
  }
  const texto = typeof corpo?.texto === "string" ? corpo.texto.slice(0, 20_000) : "";
  if (modo === "conversa" && !imagens.length && !texto.trim()) return "sem_conversa";

  let cliente: ClienteConhecido | null = null;
  if (corpo?.cliente && typeof corpo.cliente === "object") {
    const c = corpo.cliente;
    const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
    const num = (v: unknown) => (Number.isFinite(v) ? Math.max(0, Math.min(999, Math.round(v as number))) : null);
    cliente = {
      nome: txt(c.nome, 60),
      resumo: txt(c.resumo, 300),
      etapa: txt(c.etapa, 30),
      temperatura: txt(c.temperatura, 10),
      diasSemContato: num(c.diasSemContato),
      tentativas: num(c.tentativas),
      motivo: c.motivo === "pos_visita" ? "pos_visita" : c.motivo === "retomar" ? "retomar" : null,
      visitaEm: txt(c.visitaEm, 60),
      mensagemPlanejada: txt(c.mensagemPlanejada, 1200),
    };
  }
  if (modo === "retomar" && !cliente) return "sem_cliente";

  return {
    modo,
    imagens,
    texto,
    imovelId: typeof corpo?.imovelId === "string" ? corpo.imovelId.slice(0, 80) : null,
    cliente,
  };
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ ok: false, erro: "metodo" }, 405);
  if (!papelDaRequisicao(req)) return negado();
  if (passouDoLimite(`ia:${context.ip}`, Number(env("LIMITE_POR_MINUTO")) || 12)) {
    return json({ ok: false, erro: "devagar" }, 429);
  }

  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ ok: false, erro: "sem_chave" }, 500);

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ ok: false, erro: "pedido_invalido" }, 400);
  }
  const entrada = lerEntrada(corpo);
  if (typeof entrada === "string") return json({ ok: false, erro: entrada }, 400);

  try {
    const { resultado, uso, modelo } = await gerarResposta(entrada, {
      apiKey,
      modelo: env("CLAUDE_MODEL") || undefined,
      esforco: env("CLAUDE_EFFORT") || undefined,
      signal: AbortSignal.timeout(55_000),
    });
    console.log(JSON.stringify({ evento: "resposta_gerada", modo: entrada.modo, imagens: entrada.imagens?.length ?? 0, modelo, uso }));
    return json({ ok: true, resultado });
  } catch (erro) {
    const codigo = erro instanceof ErroIA ? erro.codigo : "falha";
    console.error(JSON.stringify({ evento: "erro_ia", codigo, mensagem: String((erro as Error)?.message ?? erro) }));
    const status = codigo === "ocupado" ? 503 : codigo === "chave" ? 500 : 502;
    return json({ ok: false, erro: codigo }, status);
  }
};

export const config: Config = {
  path: "/api/responder",
  method: "POST",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
