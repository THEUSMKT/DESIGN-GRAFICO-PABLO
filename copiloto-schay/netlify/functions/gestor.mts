// GET /api/gestor: só para o gestor (ADMIN_CODE). Devolve o link pessoal da corretora e todos os clientes.
import type { Config, Context } from "@netlify/functions";
import { listarClientes } from "../lib/clientes.mts";
import { env, json, negado, papelDaRequisicao, passouDoLimite } from "../lib/seguranca.mts";

export default async (req: Request, context: Context) => {
  if (passouDoLimite(`ges:${context.ip}`, 20)) return json({ ok: false, erro: "devagar" }, 429);
  if (papelDaRequisicao(req) !== "gestor") return negado();
  const base = env("URL") || new URL(req.url).origin;
  const codigo = env("APP_ACCESS_CODE");
  try {
    return json({
      ok: true,
      link: codigo ? `${base}/?c=${encodeURIComponent(codigo)}` : null,
      instalar: `${base}/instalar`,
      clientes: await listarClientes(),
    });
  } catch (erro) {
    console.error(JSON.stringify({ evento: "erro_gestor", mensagem: String((erro as Error)?.message ?? erro) }));
    return json({ ok: false, erro: "falha" }, 500);
  }
};

export const config: Config = {
  path: "/api/gestor",
  method: "GET",
};
