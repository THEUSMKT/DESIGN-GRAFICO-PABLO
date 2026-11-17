// Guarda os clientes no Netlify Blobs (um registro por cliente).
// LGPD: só o mínimo para o trabalho da corretora. Nada de prints nem da conversa inteira.
import { getStore } from "@netlify/blobs";

export const ETAPAS = ["novo", "conversando", "visita_marcada", "proposta", "vendido", "perdido"] as const;

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  imovelId: string | null;
  etapa: (typeof ETAPAS)[number];
  motivoPerda: string | null;
  temperatura: "frio" | "morno" | "quente" | null;
  resumo: string;
  anotacoes: string;
  criadoEm: string;
  primeiroContato: string | null;
  primeiraRespostaEm: string | null;
  medirResposta: boolean;
  ultimaInteracao: string | null;
  aguardandoDesde: string | null;
  proximoFollowup: string | null;
  followupMotivo: "retomar" | "pos_visita" | null;
  followupMensagem: string;
  tentativas: number;
  visitaEm: string | null;
  historico: { tipo: string; em: string }[];
  atualizadoEm: string;
};

function loja() {
  return getStore({ name: "clientes", consistency: "strong" });
}

const texto = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const data = (v: unknown): string | null => {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** Aceita só os campos conhecidos, com tamanho limitado. Devolve null se o registro não serve. */
export function limparCliente(c: any): Cliente | null {
  if (!c || typeof c !== "object") return null;
  if (typeof c.id !== "string" || !/^[a-z0-9-]{8,40}$/.test(c.id)) return null;
  const atualizadoEm = data(c.atualizadoEm);
  const criadoEm = data(c.criadoEm);
  if (!atualizadoEm || !criadoEm) return null;
  const telefone = typeof c.telefone === "string" ? c.telefone.replace(/\D/g, "").slice(0, 13) : "";
  return {
    id: c.id,
    nome: texto(c.nome, 60) || "Cliente",
    telefone: telefone || null,
    imovelId: texto(c.imovelId, 80) || null,
    etapa: ETAPAS.includes(c.etapa) ? c.etapa : "novo",
    motivoPerda: texto(c.motivoPerda, 80) || null,
    temperatura: ["frio", "morno", "quente"].includes(c.temperatura) ? c.temperatura : null,
    resumo: texto(c.resumo, 240),
    anotacoes: texto(c.anotacoes, 1000),
    criadoEm,
    primeiroContato: data(c.primeiroContato),
    primeiraRespostaEm: data(c.primeiraRespostaEm),
    medirResposta: c.medirResposta === true,
    ultimaInteracao: data(c.ultimaInteracao),
    aguardandoDesde: data(c.aguardandoDesde),
    proximoFollowup: data(c.proximoFollowup),
    followupMotivo: c.followupMotivo === "pos_visita" ? "pos_visita" : c.followupMotivo === "retomar" ? "retomar" : null,
    followupMensagem: texto(c.followupMensagem, 1200),
    tentativas: Number.isFinite(c.tentativas) ? Math.max(0, Math.min(20, Math.round(c.tentativas))) : 0,
    visitaEm: data(c.visitaEm),
    historico: (Array.isArray(c.historico) ? c.historico : [])
      .map((h: any) => ({ tipo: texto(h?.tipo, 30), em: data(h?.em) }))
      .filter((h: { tipo: string; em: string | null }) => h.tipo && h.em)
      .slice(-80) as { tipo: string; em: string }[],
    atualizadoEm,
  };
}

export async function listarClientes(): Promise<Cliente[]> {
  const store = loja();
  const { blobs } = await store.list({ prefix: "c/" });
  const resultado: Cliente[] = [];
  // Lê em lotes para não abrir centenas de conexões ao mesmo tempo.
  for (let i = 0; i < blobs.length; i += 16) {
    const lote = await Promise.all(blobs.slice(i, i + 16).map((b) => store.get(b.key, { type: "json" })));
    for (const item of lote) {
      const limpo = limparCliente(item);
      if (limpo) resultado.push(limpo);
    }
  }
  return resultado;
}

/** Grava se for mais novo do que o que já está salvo. Devolve a versão que ficou valendo. */
export async function salvarCliente(cliente: Cliente): Promise<{ aplicado: boolean; atual: Cliente }> {
  const store = loja();
  const chave = `c/${cliente.id}`;
  const existente = limparCliente(await store.get(chave, { type: "json" }));
  if (existente && Date.parse(existente.atualizadoEm) > Date.parse(cliente.atualizadoEm)) {
    return { aplicado: false, atual: existente };
  }
  await store.setJSON(chave, cliente);
  return { aplicado: true, atual: cliente };
}

export async function apagarCliente(id: string): Promise<void> {
  if (!/^[a-z0-9-]{8,40}$/.test(id)) return;
  await loja().delete(`c/${id}`);
}
