// Testa o "cérebro" com 3 conversas fictícias (prints em scripts/conversas-teste/):
//   1) lead frio que só pergunta "quanto é?"
//   2) "vou falar com meu marido"
//   3) lead que sumiu há 3 dias (pelo print e também pelo botão "Ver o que mandar")
//
//   ANTHROPIC_API_KEY=... npm run testar
//
// Mostra o resultado no terminal e grava em scripts/conversas-teste/resultado.md
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gerarResposta, MODELO_PADRAO, ESFORCO_PADRAO } from "../netlify/lib/cerebro.mts";

const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), "conversas-teste");
const conversas = JSON.parse(await readFile(path.join(pasta, "conversas.json"), "utf8"));
const opcoes = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  modelo: process.env.CLAUDE_MODEL || MODELO_PADRAO,
  esforco: process.env.CLAUDE_EFFORT || ESFORCO_PADRAO,
};

const casos = [];
for (const c of conversas) {
  const dados = (await readFile(path.join(pasta, c.arquivo))).toString("base64");
  casos.push({ titulo: c.titulo, print: c.arquivo, entrada: { modo: "conversa", imagens: [{ tipo: "image/png", dados }], imovelId: c.imovelId } });
}
casos.push({
  titulo: "Lead que sumiu há 3 dias (botão “Ver o que mandar”, sem print)",
  entrada: {
    modo: "retomar",
    imovelId: "exemplo-apto-centro",
    cliente: {
      nome: "Rafael",
      resumo: "Quer sair do aluguel até o meio do ano; perguntou do apartamento do centro.",
      etapa: "conversando",
      temperatura: "morno",
      diasSemContato: 3,
      tentativas: 0,
      motivo: "retomar",
      mensagemPlanejada: null,
    },
  },
});

const SELO = { quente: "🔥 Quente", morno: "🙂 Morno", frio: "❄️ Frio" };
const linhas = [`# Teste das conversas fictícias`, ``, `Modelo: \`${opcoes.modelo}\` · esforço: \`${opcoes.esforco}\` · ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, ``];

for (const caso of casos) {
  const inicio = Date.now();
  process.stdout.write(`\n▶ ${caso.titulo} … `);
  try {
    const { resultado: r, uso, modelo } = await gerarResposta(caso.entrada, opcoes);
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`ok (${segundos}s)`);
    const bloco = [
      `## ${caso.titulo}`,
      caso.print ? `Print: \`${caso.print}\`` : "",
      ``,
      `- **Selo:** ${SELO[r.temperatura]} — ${r.leitura}`,
      `- **Cliente lido:** ${r.cliente.nome ?? "—"} · ${r.cliente.telefone ?? "sem telefone"} · imóvel: ${r.imovel_id ?? "—"} · momento: ${r.momento} · etapa: ${r.etapa}`,
      `- **Responda assim (${r.respostas[0].tipo}):**`,
      `  > ${r.respostas[0].texto.replace(/\n/g, "\n  > ")}`,
      r.respostas[1] ? `- **Outra opção (${r.respostas[1].tipo}):**\n  > ${r.respostas[1].texto.replace(/\n/g, "\n  > ")}` : "",
      `- **Objetivo agora:** ${r.proximo_passo}`,
      `- **Se não responder:** ${r.followup.precisa ? `${r.followup.quando} (dias: ${r.followup.dias}, ${r.followup.hora})` : "não chamar de novo"}`,
      r.followup.precisa ? `  > ${r.followup.mensagem}` : "",
      `- **💡 Dica:** ${r.por_que}`,
      `- **Resumo guardado:** ${r.resumo}`,
      `- _${segundos}s · ${modelo} · entrada ${uso?.input_tokens ?? "?"} tokens (cache lido ${uso?.cache_read_input_tokens ?? 0}) · saída ${uso?.output_tokens ?? "?"} tokens_`,
      ``,
    ].filter((l) => l !== "");
    console.log(bloco.join("\n"));
    linhas.push(...bloco, "");
  } catch (erro) {
    console.log(`ERRO: ${erro.codigo ?? ""} ${erro.message}`);
    linhas.push(`## ${caso.titulo}`, ``, `**Erro:** ${erro.codigo ?? ""} ${erro.message}`, ``);
    process.exitCode = 1;
  }
}

await writeFile(path.join(pasta, "resultado.md"), linhas.join("\n"));
console.log(`\nResultado gravado em scripts/conversas-teste/resultado.md`);
