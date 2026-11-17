// Controle de acesso e limite de uso, compartilhados pelas funções.
import { createHash, timingSafeEqual } from "node:crypto";

function env(nome: string): string {
  const global = globalThis as { Netlify?: { env: { get(n: string): string | undefined } } };
  return (global.Netlify?.env.get(nome) ?? process.env[nome] ?? "").trim();
}

export { env };

function iguais(a: string, b: string): boolean {
  // Compara pelo hash para não vazar o tamanho nem o conteúdo pelo tempo de resposta.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type Papel = "corretora" | "gestor";

/** Descobre quem está chamando pelo cabeçalho x-codigo. Retorna null se o código não vale. */
export function papelDaRequisicao(req: Request): Papel | null {
  const codigo = (req.headers.get("x-codigo") ?? "").trim();
  if (!codigo) return null;
  const admin = env("ADMIN_CODE");
  const app = env("APP_ACCESS_CODE");
  if (admin && iguais(codigo, admin)) return "gestor";
  if (app && iguais(codigo, app)) return "corretora";
  return null;
}

export function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function negado(): Response {
  return json({ ok: false, erro: "acesso_negado" }, 401);
}

// Limite simples por IP, em memória (vale por instância da função).
// O limite "oficial" fica no config.rateLimit de cada função, aplicado pelo Netlify.
const janelas = new Map<string, number[]>();

export function passouDoLimite(chave: string, maximoPorMinuto: number): boolean {
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < 60_000);
  if (recentes.length >= maximoPorMinuto) {
    janelas.set(chave, recentes);
    return true;
  }
  recentes.push(agora);
  janelas.set(chave, recentes);
  if (janelas.size > 5000) janelas.clear();
  return false;
}
