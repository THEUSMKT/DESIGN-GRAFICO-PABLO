// /api/clientes
//   GET    → lista os clientes (corretora ou gestor)
//   PUT    → grava/atualiza clientes { clientes: [...] } (corretora ou gestor)
//   DELETE → apaga um cliente ?id=... (só gestor, para pedidos de exclusão / LGPD)
import type { Config, Context } from "@netlify/functions";
import { apagarCliente, limparCliente, listarClientes, salvarCliente } from "../lib/clientes.mts";
import { json, negado, papelDaRequisicao, passouDoLimite } from "../lib/seguranca.mts";

export default async (req: Request, context: Context) => {
  const papel = papelDaRequisicao(req);
  if (!papel) return negado();
  if (passouDoLimite(`cli:${context.ip}`, 90)) return json({ ok: false, erro: "devagar" }, 429);

  try {
    if (req.method === "GET") {
      return json({ ok: true, clientes: await listarClientes() });
    }

    if (req.method === "PUT") {
      let corpo: any;
      try {
        corpo = await req.json();
      } catch {
        return json({ ok: false, erro: "pedido_invalido" }, 400);
      }
      const lista = Array.isArray(corpo?.clientes) ? corpo.clientes.slice(0, 100) : [];
      const salvos: string[] = [];
      const maisNovosNoServidor: unknown[] = [];
      for (const bruto of lista) {
        const cliente = limparCliente(bruto);
        if (!cliente) continue;
        const { aplicado, atual } = await salvarCliente(cliente);
        if (aplicado) salvos.push(cliente.id);
        else maisNovosNoServidor.push(atual);
      }
      return json({ ok: true, salvos, maisNovosNoServidor });
    }

    if (req.method === "DELETE") {
      if (papel !== "gestor") return negado();
      const id = new URL(req.url).searchParams.get("id") ?? "";
      await apagarCliente(id);
      return json({ ok: true });
    }

    return json({ ok: false, erro: "metodo" }, 405);
  } catch (erro) {
    console.error(JSON.stringify({ evento: "erro_clientes", mensagem: String((erro as Error)?.message ?? erro) }));
    return json({ ok: false, erro: "falha" }, 500);
  }
};

export const config: Config = {
  path: "/api/clientes",
  method: ["GET", "PUT", "DELETE"],
};
