// O "cérebro" do app: monta o pedido para o Claude e devolve a resposta organizada.
import Anthropic from "@anthropic-ai/sdk";
import { PLAYBOOK } from "./playbook.gerado.mjs";
import imoveis from "../../public/imoveis.json" with { type: "json" };

export const MODELO_PADRAO = "claude-sonnet-5-5";
export const ESFORCO_PADRAO = "low"; // conversa rápida no celular: "low" responde mais depressa

type Imovel = { id: string; titulo: string; exemplo?: boolean; [campo: string]: unknown };
const CATALOGO = imoveis as Imovel[];
const IDS = new Set(CATALOGO.map((i) => i.id));

export type Imagem = { tipo: "image/jpeg" | "image/png" | "image/webp"; dados: string };

export type ClienteConhecido = {
  nome?: string | null;
  resumo?: string | null;
  etapa?: string | null;
  temperatura?: string | null;
  diasSemContato?: number | null;
  tentativas?: number | null;
  motivo?: "retomar" | "pos_visita" | null;
  visitaEm?: string | null;
  mensagemPlanejada?: string | null;
};

export type Entrada = {
  modo: "conversa" | "retomar";
  imagens?: Imagem[];
  texto?: string;
  imovelId?: string | null;
  cliente?: ClienteConhecido | null;
  agora?: Date;
};

export type Resultado = {
  cliente: { nome: string | null; telefone: string | null };
  imovel_id: string | null;
  momento: "primeiro_contato" | "conversando" | "sumiu" | "pos_visita";
  etapa: "novo" | "conversando" | "visita_marcada" | "proposta" | "vendido" | "perdido";
  temperatura: "frio" | "morno" | "quente";
  leitura: string;
  respostas: { texto: string; tipo: "texto" | "audio" }[];
  proximo_passo: string;
  followup: { precisa: boolean; dias: number; hora: string; quando: string; mensagem: string };
  por_que: string;
  resumo: string;
  hora_primeira_mensagem_hoje: string | null;
  pediu_para_parar: boolean;
};

const textoOuNulo = { anyOf: [{ type: "string" }, { type: "null" }] };

// Formato JSON que o Claude é obrigado a seguir (saída estruturada).
export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "cliente", "imovel_id", "momento", "etapa", "temperatura", "leitura", "respostas",
    "proximo_passo", "followup", "por_que", "resumo", "hora_primeira_mensagem_hoje", "pediu_para_parar",
  ],
  properties: {
    cliente: {
      type: "object",
      additionalProperties: false,
      required: ["nome", "telefone"],
      properties: { nome: textoOuNulo, telefone: textoOuNulo },
    },
    imovel_id: textoOuNulo,
    momento: { type: "string", enum: ["primeiro_contato", "conversando", "sumiu", "pos_visita"] },
    etapa: { type: "string", enum: ["novo", "conversando", "visita_marcada", "proposta", "vendido", "perdido"] },
    temperatura: { type: "string", enum: ["frio", "morno", "quente"] },
    leitura: { type: "string" },
    respostas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["texto", "tipo"],
        properties: { texto: { type: "string" }, tipo: { type: "string", enum: ["texto", "audio"] } },
      },
    },
    proximo_passo: { type: "string" },
    followup: {
      type: "object",
      additionalProperties: false,
      required: ["precisa", "dias", "hora", "quando", "mensagem"],
      properties: {
        precisa: { type: "boolean" },
        dias: { type: "integer" },
        hora: { type: "string" },
        quando: { type: "string" },
        mensagem: { type: "string" },
      },
    },
    por_que: { type: "string" },
    resumo: { type: "string" },
    hora_primeira_mensagem_hoje: textoOuNulo,
    pediu_para_parar: { type: "boolean" },
  },
} as const;

/** Prompt de sistema: playbook + lista de imóveis. Fica igual entre pedidos, então entra no cache. */
export function montarSistema(): string {
  const temExemplo = CATALOGO.some((i) => i.exemplo);
  return [
    PLAYBOOK,
    "## Imóveis disponíveis (imoveis.json)",
    temExemplo
      ? 'Imóveis com "exemplo": true são de demonstração (a imobiliária ainda vai trocar pelos reais). Para eles, use os valores que aparecem depois de "ex.:" como se fossem os dados do imóvel, e nunca cite o texto "EXEMPLO - SUBSTITUIR" para o cliente.'
      : "Use apenas estes dados. O que não estiver aqui, a Schay precisa confirmar.",
    "```json",
    JSON.stringify(CATALOGO, null, 1),
    "```",
  ].join("\n\n");
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function descreverCliente(c: ClienteConhecido): string {
  const linhas = ["## O que o app já sabe deste cliente"];
  if (c.nome) linhas.push(`- Nome: ${c.nome}`);
  if (c.resumo) linhas.push(`- Resumo: ${c.resumo}`);
  if (c.etapa) linhas.push(`- Etapa: ${c.etapa}`);
  if (c.temperatura) linhas.push(`- Como estava: ${c.temperatura}`);
  if (typeof c.diasSemContato === "number") linhas.push(`- Dias sem conversar: ${c.diasSemContato}`);
  if (typeof c.tentativas === "number") linhas.push(`- Mensagens de retomada já enviadas sem resposta: ${c.tentativas}`);
  if (c.visitaEm) linhas.push(`- Visita marcada para: ${c.visitaEm}`);
  if (c.mensagemPlanejada) linhas.push(`- Mensagem de retomada sugerida antes: "${c.mensagemPlanejada}"`);
  return linhas.join("\n");
}

/** Monta a mensagem do usuário: prints/texto da conversa + situação atual. */
export function montarPedido(entrada: Entrada): Anthropic.Beta.BetaContentBlockParam[] {
  const blocos: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of entrada.imagens ?? []) {
    blocos.push({ type: "image", source: { type: "base64", media_type: img.tipo, data: img.dados } });
  }

  const imovel = entrada.imovelId ? CATALOGO.find((i) => i.id === entrada.imovelId) : null;
  const partes = [
    "## Situação",
    `- Agora: ${dataHora.format(entrada.agora ?? new Date())} (horário de Brasília)`,
    `- Imóvel indicado pela Schay: ${imovel ? `${imovel.id} (${imovel.titulo})` : "não informado"}`,
  ];
  if (entrada.cliente) partes.push("", descreverCliente(entrada.cliente));

  if (entrada.modo === "retomar") {
    const posVisita = entrada.cliente?.motivo === "pos_visita";
    partes.push(
      "",
      "## O que fazer",
      posVisita
        ? "A Schay quer saber o que o cliente achou da visita. Escreva a mensagem de pós-visita (momento = pos_visita): perguntar a impressão, abrir espaço para a objeção real e propor o próximo passo."
        : "O cliente parou de responder. Escreva a mensagem de retomada certa para o número de tentativas já feitas (0 = D+1, 1 = D+3, 2 = D+7, 3 ou mais = D+14 despedida). momento = sumiu.",
      "Não há print desta vez. Use só o que o app sabe do cliente e os dados do imóvel; não invente fatos sobre a conversa.",
    );
  } else {
    if (entrada.texto?.trim()) {
      partes.push("", "## Conversa colada pela Schay (texto)", entrada.texto.trim());
    }
    if (entrada.imagens?.length) {
      partes.push("", `## Conversa: ${entrada.imagens.length} print(s) do WhatsApp acima, em ordem.`);
    }
    partes.push("", "## O que fazer", "Leia a conversa e sugira a próxima mensagem da Schay para este cliente.");
  }
  partes.push("Responda no formato JSON pedido.");
  blocos.push({ type: "text", text: partes.join("\n") });
  return blocos;
}

export type CodigoErro = "recusa" | "incompleta" | "invalida" | "ocupado" | "chave" | "falha";

export class ErroIA extends Error {
  codigo: CodigoErro;
  constructor(codigo: CodigoErro, mensagem?: string) {
    super(mensagem ?? codigo);
    this.codigo = codigo;
  }
}

const limitar = (s: unknown, max: number): string => (typeof s === "string" ? s.trim().slice(0, max) : "");

/** Confere e arruma o JSON devolvido, para o app nunca quebrar por um campo estranho. */
export function normalizarResultado(bruto: any): Resultado {
  const respostas = (Array.isArray(bruto?.respostas) ? bruto.respostas : [])
    .map((r: any) => ({ texto: limitar(r?.texto, 1200), tipo: r?.tipo === "audio" ? "audio" : "texto" }))
    .filter((r: { texto: string }) => r.texto)
    .slice(0, 2) as Resultado["respostas"];
  if (!respostas.length) throw new ErroIA("invalida", "sem respostas");
  // A opção principal precisa ser texto (é a que vai no botão de copiar).
  if (respostas[0].tipo === "audio") {
    const texto = respostas.findIndex((r) => r.tipo === "texto");
    if (texto > 0) respostas.unshift(...respostas.splice(texto, 1));
    else respostas[0].tipo = "texto";
  }

  const umDe = <T extends string>(v: unknown, ok: readonly T[], padrao: T): T => (ok.includes(v as T) ? (v as T) : padrao);
  const telefone = typeof bruto?.cliente?.telefone === "string" ? bruto.cliente.telefone.replace(/\D/g, "") : "";
  const hora = typeof bruto?.followup?.hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(bruto.followup.hora) ? bruto.followup.hora : "10:00";
  const horaPrimeira = typeof bruto?.hora_primeira_mensagem_hoje === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(bruto.hora_primeira_mensagem_hoje)
    ? bruto.hora_primeira_mensagem_hoje
    : null;
  const dias = Number.isFinite(bruto?.followup?.dias) ? Math.min(30, Math.max(0, Math.round(bruto.followup.dias))) : 1;

  return {
    cliente: {
      nome: limitar(bruto?.cliente?.nome, 60) || null,
      telefone: telefone.length >= 10 && telefone.length <= 13 ? telefone : null,
    },
    imovel_id: IDS.has(bruto?.imovel_id) ? bruto.imovel_id : null,
    momento: umDe(bruto?.momento, ["primeiro_contato", "conversando", "sumiu", "pos_visita"] as const, "conversando"),
    etapa: umDe(bruto?.etapa, ["novo", "conversando", "visita_marcada", "proposta", "vendido", "perdido"] as const, "conversando"),
    temperatura: umDe(bruto?.temperatura, ["frio", "morno", "quente"] as const, "morno"),
    leitura: limitar(bruto?.leitura, 300),
    respostas,
    proximo_passo: limitar(bruto?.proximo_passo, 160),
    followup: {
      precisa: bruto?.followup?.precisa !== false && !bruto?.pediu_para_parar,
      dias,
      hora,
      quando: limitar(bruto?.followup?.quando, 80),
      mensagem: limitar(bruto?.followup?.mensagem, 1200),
    },
    por_que: limitar(bruto?.por_que, 300),
    resumo: limitar(bruto?.resumo, 240),
    hora_primeira_mensagem_hoje: horaPrimeira,
    pediu_para_parar: bruto?.pediu_para_parar === true,
  };
}

export type Opcoes = { apiKey?: string; modelo?: string; esforco?: string; signal?: AbortSignal };

/** Chama o Claude e devolve o resultado já conferido. */
export async function gerarResposta(entrada: Entrada, opcoes: Opcoes = {}): Promise<{ resultado: Resultado; uso: unknown; modelo: string }> {
  const client = new Anthropic({ apiKey: opcoes.apiKey, maxRetries: 1, timeout: 45_000 });
  const esforco = (["low", "medium", "high"].includes(opcoes.esforco ?? "") ? opcoes.esforco : ESFORCO_PADRAO) as "low" | "medium" | "high";
  const modelo = opcoes.modelo || MODELO_PADRAO;

  let resposta: Anthropic.Beta.BetaMessage;
  try {
    resposta = await client.beta.messages.create(
      {
        model: modelo,
        max_tokens: 16000,
        // Se o modelo recusar por política, o próprio servidor tenta de novo num modelo reserva.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: montarSistema(), cache_control: { type: "ephemeral" } }],
        output_config: { effort: esforco, format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
        messages: [{ role: "user", content: montarPedido(entrada) }],
      },
      { signal: opcoes.signal },
    );
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError || erro instanceof Anthropic.PermissionDeniedError) throw new ErroIA("chave", erro.message);
    if (erro instanceof Anthropic.RateLimitError) throw new ErroIA("ocupado", erro.message);
    if (erro instanceof Anthropic.APIError && (erro.status ?? 0) >= 500) throw new ErroIA("ocupado", erro.message);
    if (erro instanceof Anthropic.APIError) throw new ErroIA("falha", erro.message);
    throw erro;
  }

  if (resposta.stop_reason === "refusal") throw new ErroIA("recusa", resposta.stop_details?.category ?? "refusal");
  if (resposta.stop_reason === "max_tokens") throw new ErroIA("incompleta");

  const texto = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroIA("invalida", "JSON inválido");
  }
  return { resultado: normalizarResultado(bruto), uso: resposta.usage, modelo: resposta.model };
}
