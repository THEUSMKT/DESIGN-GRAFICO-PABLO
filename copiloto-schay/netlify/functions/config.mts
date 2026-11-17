// GET /api/config: confere o código de acesso e devolve o número do suporte.
import type { Config, Context } from "@netlify/functions";
import { env, json, negado, papelDaRequisicao, passouDoLimite } from "../lib/seguranca.mts";

export default async (req: Request, context: Context) => {
  // Limita tentativas de adivinhar o código de acesso.
  if (passouDoLimite(`cfg:${context.ip}`, 20)) return json({ ok: false, erro: "devagar" }, 429);
  const papel = papelDaRequisicao(req);
  if (!papel) return negado();
  return json({
    ok: true,
    papel,
    suporte: env("SUPPORT_WHATSAPP").replace(/\D/g, "") || null,
  });
};

export const config: Config = {
  path: "/api/config",
  method: "GET",
};
