/* Painel do gestor: relatório da semana, funil completo e link de acesso da Schay.
   Protegido pelo ADMIN_CODE (fica guardado só neste navegador). */
"use strict";

(() => {
  const CHAVE = "copiloto.admin";
  const painel = document.getElementById("painel");
  const abas = document.getElementById("abas");
  const botaoSair = document.getElementById("sair");
  const dica = document.getElementById("dica-grafico");

  const ETAPAS = [
    ["novo", "Novo"],
    ["conversando", "Conversando"],
    ["visita_marcada", "Visita marcada"],
    ["proposta", "Proposta"],
    ["vendido", "Vendido"],
    ["perdido", "Perdido"],
  ];
  const NOME_ETAPA = Object.fromEntries(ETAPAS);
  const ATIVAS = new Set(["novo", "conversando", "visita_marcada", "proposta"]);
  const HORA = 3_600_000;
  const DIA = 24 * HORA;

  let codigo = lerCodigo();
  let dados = null; // { link, instalar, clientes }
  let imoveis = [];
  let aba = "relatorio";
  let periodoEscolhido = "semana";
  let busca = "";

  // ---------------------------------------------------------------- utilidades
  function lerCodigo() {
    try { return localStorage.getItem(CHAVE); } catch { return null; }
  }
  function gravarCodigo(v) {
    try { v ? localStorage.setItem(CHAVE, v) : localStorage.removeItem(CHAVE); } catch { /* ignorar */ }
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const t = (v) => (v ? Date.parse(v) : NaN);
  const fmtNum = new Intl.NumberFormat("pt-BR");
  const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const fmtDia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  const quando = (v) => (v ? fmtData.format(new Date(v)) : "—");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const semExemplo = (s) => String(s ?? "").replace(/EXEMPLO - SUBSTITUIR:?\s*(·\s*)?/g, "").replace(/^\(ex\.:\s*(.*)\)$/, "$1").trim();
  const nomeImovel = (id) => semExemplo(imoveis.find((i) => i.id === id)?.titulo) || (id ? "(imóvel removido)" : "Não informado");
  const nomeCliente = (c) => c.nome || (c.telefone ? foneBonito(c.telefone) : "Sem nome");

  function foneBonito(v) {
    let n = String(v ?? "").replace(/\D/g, "");
    if (n.length > 11 && n.startsWith("55")) n = n.slice(2);
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return v || "";
  }

  function duracao(ms) {
    if (!Number.isFinite(ms)) return "—";
    const min = Math.round(ms / 60_000);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}min` : ""}`;
    return `${(ms / DIA).toFixed(1).replace(".", ",")} dias`;
  }

  function haQuanto(v) {
    const ms = Date.now() - t(v);
    if (!Number.isFinite(ms)) return "—";
    if (ms < HORA) return `há ${Math.max(1, Math.round(ms / 60_000))} min`;
    if (ms < DIA) return `há ${Math.round(ms / HORA)}h`;
    return `há ${Math.round(ms / DIA)} dia(s)`;
  }

  let temporizadorAviso;
  function aviso(texto) {
    const el = document.getElementById("aviso");
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { el.hidden = true; }, 3000);
  }

  async function api(caminho, opcoes = {}) {
    const r = await fetch(caminho, {
      method: opcoes.metodo || "GET",
      headers: { "content-type": "application/json", "x-codigo": opcoes.codigo ?? codigo ?? "" },
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
      cache: "no-store",
    });
    let d = null;
    try { d = await r.json(); } catch { /* vazio */ }
    if (!r.ok || !d?.ok) {
      const e = new Error(d?.erro || `HTTP ${r.status}`);
      e.status = r.status;
      throw e;
    }
    return d;
  }

  // ---------------------------------------------------------------- período
  function periodo(tipo) {
    const agora = new Date();
    const segunda = new Date(agora);
    segunda.setHours(0, 0, 0, 0);
    segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
    if (tipo === "passada") {
      const ini = new Date(segunda);
      ini.setDate(ini.getDate() - 7);
      return { ini: ini.getTime(), fim: segunda.getTime(), nome: `${fmtDia.format(ini)} a ${fmtDia.format(new Date(segunda.getTime() - DIA))}` };
    }
    if (tipo === "30") {
      const ini = agora.getTime() - 30 * DIA;
      return { ini, fim: agora.getTime() + 1, nome: `${fmtDia.format(new Date(ini))} a ${fmtDia.format(agora)}` };
    }
    return { ini: segunda.getTime(), fim: agora.getTime() + 1, nome: `${fmtDia.format(segunda)} a ${fmtDia.format(agora)}` };
  }

  const dentro = (v, p) => {
    const x = t(v);
    return Number.isFinite(x) && x >= p.ini && x < p.fim;
  };
  const teveEvento = (c, tipo, p) => (c.historico || []).some((h) => h.tipo === tipo && dentro(h.em, p));

  function calcular(clientes, p) {
    const agora = Date.now();
    const recebidos = clientes.filter((c) => dentro(c.primeiroContato || c.criadoEm, p));
    const conversas = clientes.filter((c) => teveEvento(c, "etapa:conversando", p));
    const visitas = clientes.filter((c) => teveEvento(c, "etapa:visita_marcada", p));
    const propostas = clientes.filter((c) => teveEvento(c, "etapa:proposta", p));
    const vendas = clientes.filter((c) => teveEvento(c, "etapa:vendido", p));
    const perdidos = clientes.filter((c) => teveEvento(c, "etapa:perdido", p));
    const tempos = recebidos
      .filter((c) => c.medirResposta && c.primeiraRespostaEm && c.primeiroContato)
      .map((c) => Math.max(0, t(c.primeiraRespostaEm) - t(c.primeiroContato)));
    const media = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : NaN;
    const ate5 = tempos.filter((ms) => ms <= 5 * 60_000).length;

    const ativos = clientes.filter((c) => ATIVAS.has(c.etapa));
    const semRetorno1h = ativos.filter((c) => c.aguardandoDesde && agora - t(c.aguardandoDesde) > HORA);
    const semRetorno24h = ativos.filter((c) => c.aguardandoDesde && agora - t(c.aguardandoDesde) > DIA);
    const atrasados = ativos.filter((c) => c.proximoFollowup && agora - t(c.proximoFollowup) > DIA);
    const semLembrete = ativos.filter((c) => !c.aguardandoDesde && !c.proximoFollowup && (c.etapa === "novo" || c.etapa === "conversando"));
    const semFollowup = new Set([...semRetorno24h, ...atrasados, ...semLembrete]);

    const fimHoje = new Date();
    fimHoje.setHours(24, 0, 0, 0);
    const followupsHoje = ativos.filter((c) => c.proximoFollowup && t(c.proximoFollowup) < fimHoje.getTime());

    const contar = (lista, chave) => {
      const m = new Map();
      for (const c of lista) {
        const k = chave(c);
        m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    return {
      recebidos, conversas, visitas, propostas, vendas, perdidos, tempos, media, ate5,
      semRetorno1h, semRetorno24h, atrasados, semLembrete, semFollowup, followupsHoje,
      porImovel: contar(recebidos, (c) => nomeImovel(c.imovelId)),
      porTemperatura: ["frio", "morno", "quente"].map((k) => [k, recebidos.filter((c) => c.temperatura === k).length]),
      motivos: contar(perdidos, (c) => c.motivoPerda || "Sem motivo"),
    };
  }

  function diagnostico(m) {
    const achados = [];
    const n = m.recebidos.length;
    if (!n) {
      achados.push(["info", "Sem dados", "Nenhum lead registrado no período. Confira se os anúncios estão rodando e se a Schay está usando o app para responder."]);
      return achados;
    }
    if (n < 5) achados.push(["info", "Poucos dados", `Só ${n} lead(s) no período: leia os números como tendência, não como regra.`]);
    const frios = m.porTemperatura.find(([k]) => k === "frio")[1];
    if (frios / n > 0.6) achados.push(["anuncio", "Anúncio", `${pct(frios, n)}% dos leads chegaram frios (só curiosidade). Vale revisar público, criativo e se o preço aparece no anúncio.`]);
    if (Number.isFinite(m.media) && m.media > 30 * 60_000) achados.push(["atendimento", "Atendimento", `A 1ª resposta está levando ${duracao(m.media)} em média. O ideal é até 5 minutos: lead frio esfria rápido.`]);
    if (n >= 3 && m.conversas.length / n < 0.3) achados.push(["anuncio", "Anúncio ou atendimento", `Só ${pct(m.conversas.length, n)}% dos leads chegaram a conversar. Se a resposta é rápida, o problema tende a ser o anúncio (lead pouco qualificado).`]);
    if (m.conversas.length >= 3 && m.visitas.length / m.conversas.length < 0.25) achados.push(["atendimento", "Atendimento", `Só ${pct(m.visitas.length, m.conversas.length)}% das conversas viraram visita. Treinar o convite para visita com 2 opções de horário.`]);
    if (m.visitas.length >= 3 && m.propostas.length + m.vendas.length === 0) achados.push(["fechamento", "Fechamento", "Teve visitas, mas nenhuma proposta. Revisar o pós-visita (perguntar a impressão em até 2h e tratar a objeção real)."]);
    if (m.semFollowup.size) achados.push(["atendimento", "Atendimento", `${m.semFollowup.size} lead(s) estão sem retorno ou com lembrete atrasado há mais de 24h.`]);
    if (achados.every(([tipo]) => tipo === "info")) achados.push(["ok", "Tudo certo", "Nenhum gargalo evidente no período. Siga acompanhando semana a semana."]);
    return achados;
  }

  // ---------------------------------------------------------------- gráficos
  /** Barras horizontais de uma cor só, com valor na ponta e dica ao passar o dedo/mouse. */
  function barras(linhas, { total, descreverDica } = {}) {
    const max = Math.max(1, ...linhas.map((l) => l.valor));
    return `<div class="barras" role="list">${linhas.map((l, i) => {
      const largura = l.valor ? Math.max(1.5, (l.valor / max) * 100) : 0;
      const porcento = total ? ` <small>(${pct(l.valor, total)}%)</small>` : "";
      const textoDica = descreverDica ? descreverDica(l, i) : `${l.nome}: ${fmtNum.format(l.valor)}`;
      return `<div class="barra-linha" role="listitem" tabindex="0" data-dica="${esc(textoDica)}" data-valor="${esc(fmtNum.format(l.valor))}" aria-label="${esc(textoDica)}">
        <span class="nome">${esc(l.nome)}</span>
        <span class="barra-trilho"><span class="area"><span class="preenchimento" style="width:${largura}%"></span><span class="numero" style="left:${largura}%">${fmtNum.format(l.valor)}${porcento}</span></span></span>
      </div>`;
    }).join("")}</div>`;
  }

  function mostrarDica(alvo, x, y) {
    dica.innerHTML = "";
    const forte = document.createElement("strong");
    forte.textContent = alvo.dataset.valor;
    const texto = document.createElement("span");
    texto.textContent = alvo.dataset.dica;
    dica.append(forte, texto);
    dica.hidden = false;
    const r = dica.getBoundingClientRect();
    dica.style.left = `${Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 12))}px`;
    dica.style.top = `${Math.max(8, y - r.height - 12)}px`;
  }

  document.addEventListener("pointermove", (e) => {
    const alvo = e.target.closest?.(".barra-linha");
    if (alvo) mostrarDica(alvo, e.clientX, e.clientY);
    else dica.hidden = true;
  });
  document.addEventListener("focusin", (e) => {
    const alvo = e.target.closest?.(".barra-linha");
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    mostrarDica(alvo, r.left + 120, r.top + 4);
  });
  document.addEventListener("focusout", () => { dica.hidden = true; });

  // ---------------------------------------------------------------- telas
  function telaLogin(erro) {
    abas.hidden = true;
    botaoSair.hidden = true;
    painel.innerHTML = `<form class="cartao login" id="form-login">
      <h1>Entrar no painel</h1>
      <p>Digite o código do gestor (ADMIN_CODE). Ele fica guardado só neste navegador.</p>
      ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ""}
      <label for="codigo-admin" class="sub">Código do gestor</label>
      <input id="codigo-admin" class="campo" type="password" autocomplete="current-password" required>
      <button class="botao" type="submit">Entrar</button>
    </form>`;
    document.getElementById("codigo-admin").focus();
  }

  function telaRelatorio() {
    const p = periodo(periodoEscolhido);
    const m = calcular(dados.clientes, p);
    const n = m.recebidos.length;
    const funil = [
      { nome: "Leads recebidos", valor: n },
      { nome: "Conversas iniciadas", valor: m.conversas.length },
      { nome: "Visitas marcadas", valor: m.visitas.length },
      { nome: "Propostas", valor: m.propostas.length },
      { nome: "Vendas", valor: m.vendas.length },
    ];
    const indicador = (rotulo, valor, detalhe) => `<div class="indicador"><div class="rotulo">${esc(rotulo)}</div><div class="valor">${esc(valor)}</div>${detalhe ? `<div class="detalhe">${esc(detalhe)}</div>` : ""}</div>`;
    const filtros = [["semana", "Esta semana"], ["passada", "Semana passada"], ["30", "Últimos 30 dias"]]
      .map(([k, nome]) => `<button type="button" data-periodo="${k}" aria-pressed="${k === periodoEscolhido}">${nome}</button>`).join("");

    painel.innerHTML = `
      <div class="filtros" role="group" aria-label="Período">${filtros}<span class="periodo">${esc(p.nome)}</span></div>
      ${imoveis.some((i) => i.exemplo) ? `<div class="aviso-exemplo">⚠️ O imoveis.json ainda tem imóveis de EXEMPLO. Troque pelos imóveis reais antes da Schay usar com clientes (veja o README).</div>` : ""}
      <section class="indicadores" aria-label="Números do período">
        ${indicador("Leads recebidos", fmtNum.format(n))}
        ${indicador("Conversas iniciadas", fmtNum.format(m.conversas.length), n ? `${pct(m.conversas.length, n)}% dos leads` : "")}
        ${indicador("Visitas marcadas", fmtNum.format(m.visitas.length))}
        ${indicador("Propostas", fmtNum.format(m.propostas.length))}
        ${indicador("Vendas", fmtNum.format(m.vendas.length))}
        ${indicador("Tempo até a 1ª resposta", duracao(m.media), m.tempos.length ? `média de ${m.tempos.length} lead(s) · ${pct(m.ate5, m.tempos.length)}% em até 5 min` : "sem medição no período")}
        ${indicador("Leads sem retorno/lembrete", fmtNum.format(m.semFollowup.size), "agora, há mais de 24h")}
      </section>
      <section class="cartao">
        <h2>Funil do período</h2>
        <p class="sub">Quantos leads passaram por cada etapa no período. A porcentagem é sobre os leads recebidos.</p>
        ${barras(funil, {
          total: n,
          descreverDica: (l, i) => (i === 0 ? `${l.nome} no período` : `${l.nome} · ${pct(l.valor, funil[i - 1].valor)}% da etapa anterior (${funil[i - 1].nome.toLowerCase()})`),
        })}
        <details><summary>Ver em tabela</summary>
          <div class="tabela-rolagem"><table>
            <thead><tr><th>Etapa</th><th class="num">Quantidade</th><th class="num">% dos leads</th><th class="num">% da etapa anterior</th></tr></thead>
            <tbody>${funil.map((l, i) => `<tr><td>${esc(l.nome)}</td><td class="num">${fmtNum.format(l.valor)}</td><td class="num">${pct(l.valor, n)}%</td><td class="num">${i ? `${pct(l.valor, funil[i - 1].valor)}%` : "—"}</td></tr>`).join("")}</tbody>
          </table></div>
        </details>
      </section>
      <section class="cartao">
        <h2>Onde o funil está travando</h2>
        <p class="sub">Leitura automática dos números: anúncio, atendimento ou fechamento.</p>
        <ul class="achados">${diagnostico(m).map(([tipo, rotulo, texto]) => `<li><span class="selo ${tipo}">${{ anuncio: "📣", atendimento: "💬", fechamento: "🤝", ok: "✓", info: "ℹ️" }[tipo] || ""} ${esc(rotulo)}</span><span>${esc(texto)}</span></li>`).join("")}</ul>
      </section>
      <section class="cartao">
        <h2>Como os leads chegam</h2>
        <p class="sub">Leitura da IA na primeira conversa (leads recebidos no período).</p>
        ${barras(m.porTemperatura.map(([k, v]) => ({ nome: { frio: "❄️ Frio", morno: "🙂 Morno", quente: "🔥 Quente" }[k], valor: v })), { total: n })}
      </section>
      <section class="cartao">
        <h2>Leads por imóvel</h2>
        <p class="sub">Qual anúncio/imóvel mais trouxe leads no período.</p>
        ${m.porImovel.length ? barras(m.porImovel.map(([nome, v]) => ({ nome, valor: v })), { total: n }) : `<p class="sub">Sem leads no período.</p>`}
      </section>
      <section class="cartao">
        <h2>Motivos de desistência</h2>
        ${m.motivos.length ? barras(m.motivos.map(([nome, v]) => ({ nome, valor: v })), { total: m.perdidos.length }) : `<p class="sub">Ninguém desistiu no período.</p>`}
      </section>`;
  }

  function fichaCliente(c) {
    const agora = Date.now();
    const atrasado = c.proximoFollowup && t(c.proximoFollowup) < agora;
    const esperando = c.aguardandoDesde ? `<div class="atrasado">⏳ Sem retorno dela ${esc(haQuanto(c.aguardandoDesde))}</div>` : "";
    const opcoes = ETAPAS.map(([k, nome]) => `<option value="${k}"${k === c.etapa ? " selected" : ""}>${nome}</option>`).join("");
    return `<article class="ficha">
      <strong>${esc(nomeCliente(c))}</strong>
      <div class="marcas">${c.temperatura ? `<span class="temp ${esc(c.temperatura)}">${esc(c.temperatura)}</span>` : ""}<span class="temp">${esc(nomeImovel(c.imovelId))}</span></div>
      ${c.telefone ? `<div class="linha-info">📱 <b>${esc(foneBonito(c.telefone))}</b></div>` : ""}
      <div class="linha-info">1º contato: <b>${esc(quando(c.primeiroContato || c.criadoEm))}</b></div>
      <div class="linha-info">Última interação: <b>${esc(quando(c.ultimaInteracao))}</b></div>
      ${ATIVAS.has(c.etapa) ? `<div class="linha-info${atrasado ? " atrasado" : ""}">Próximo lembrete: <b>${esc(quando(c.proximoFollowup))}</b></div>` : ""}
      ${esperando}
      ${c.etapa === "perdido" && c.motivoPerda ? `<div class="linha-info">Motivo: <b>${esc(c.motivoPerda)}</b></div>` : ""}
      ${c.resumo ? `<div class="linha-info">${esc(c.resumo)}</div>` : ""}
      ${c.anotacoes ? `<div class="linha-info">📝 ${esc(c.anotacoes)}</div>` : ""}
      <details><summary>Editar</summary>
        <div class="editar" data-id="${esc(c.id)}">
          <label for="etapa-${esc(c.id)}">Etapa</label>
          <select id="etapa-${esc(c.id)}" class="campo" data-campo="etapa">${opcoes}</select>
          <label for="motivo-${esc(c.id)}">Motivo (se perdido)</label>
          <input id="motivo-${esc(c.id)}" class="campo" data-campo="motivoPerda" value="${esc(c.motivoPerda || "")}">
          <label for="notas-${esc(c.id)}">Anotações</label>
          <textarea id="notas-${esc(c.id)}" class="campo" data-campo="anotacoes">${esc(c.anotacoes || "")}</textarea>
          <div class="acoes"><button class="botao pequeno" type="button" data-salvar="${esc(c.id)}">Salvar</button>
          <button class="botao perigo pequeno" type="button" data-apagar="${esc(c.id)}">Apagar (pedido do cliente)</button></div>
        </div>
      </details>
    </article>`;
  }

  function telaFunil() {
    const m = calcular(dados.clientes, periodo("semana"));
    const filtro = busca.trim().toLowerCase();
    const lista = dados.clientes
      .filter((c) => !filtro || `${c.nome} ${c.telefone || ""}`.toLowerCase().includes(filtro))
      .sort((a, b) => t(b.ultimaInteracao || b.criadoEm) - t(a.ultimaInteracao || a.criadoEm));
    const alerta = (classe, numero, texto) => `<div class="alerta ${classe}"><strong>${fmtNum.format(numero)}</strong><span>${esc(texto)}</span></div>`;
    painel.innerHTML = `
      <section class="alertas" aria-label="Alertas de hoje">
        ${alerta("", m.followupsHoje.length, "Lembretes de hoje")}
        ${alerta(m.semRetorno1h.length ? "atencao" : "", m.semRetorno1h.length, "Sem retorno dela há +1h")}
        ${alerta(m.semRetorno24h.length ? "critico" : "", m.semRetorno24h.length, "Sem retorno dela há +24h")}
        ${alerta(m.atrasados.length ? "critico" : "", m.atrasados.length, "Lembretes atrasados há +24h")}
      </section>
      <div class="filtros"><label class="escondido" for="busca">Buscar cliente</label>
        <input id="busca" class="campo" type="search" placeholder="Buscar por nome ou telefone" value="${esc(busca)}" style="max-width:360px"></div>
      <section class="quadro" aria-label="Funil por etapa">
        ${ETAPAS.map(([k, nome]) => {
          const daEtapa = lista.filter((c) => c.etapa === k);
          return `<div class="coluna"><h3>${nome}<span>${daEtapa.length}</span></h3>${daEtapa.map(fichaCliente).join("") || `<p class="sub" style="padding:4px 6px">Nenhum</p>`}</div>`;
        }).join("")}
      </section>`;
  }

  function telaAcesso() {
    const msgLink = `Oi, Schay! Este é o seu Copiloto de Vendas 💛 Toque no link para abrir: ${dados.link}`;
    const msgInstalar = `Para colocar o Copiloto na tela do seu celular, siga este passo a passo: ${dados.instalar}`;
    painel.innerHTML = `
      <section class="cartao">
        <h2>Link pessoal da Schay</h2>
        <p class="sub">Ao abrir este link no celular, o acesso fica salvo e ela não precisa digitar senha. Não compartilhe com outras pessoas.</p>
        ${dados.link ? `<div class="link-caixa">${esc(dados.link)}</div>
        <div class="acoes">
          <button class="botao" type="button" data-copiar="${esc(dados.link)}">Copiar link</button>
          <a class="botao verde" href="https://wa.me/?text=${encodeURIComponent(msgLink)}" target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
        </div>` : `<p class="erro">A variável APP_ACCESS_CODE não está configurada no Netlify.</p>`}
      </section>
      <section class="cartao">
        <h2>Como instalar na tela inicial</h2>
        <p class="sub">Passo a passo ilustrado para Android e iPhone. Mande para ela depois do link pessoal.</p>
        <div class="acoes">
          <a class="botao claro" href="/instalar" target="_blank" rel="noopener">Ver o passo a passo</a>
          <a class="botao verde" href="https://wa.me/?text=${encodeURIComponent(msgInstalar)}" target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
        </div>
      </section>
      <section class="cartao">
        <h2>Exportar</h2>
        <p class="sub">Planilha com todos os clientes (abre no Excel ou Google Planilhas).</p>
        <div class="acoes"><button class="botao claro" type="button" id="baixar-csv">Baixar planilha (CSV)</button></div>
      </section>
      <section class="cartao">
        <h2>Privacidade (LGPD)</h2>
        <p class="sub">O app guarda só nome, telefone, imóvel, datas, um resumo de 1 linha e anotações. Os prints das conversas não são gravados. Se um cliente pedir para apagar os dados dele, use “Apagar” na ficha dele (aba Funil).</p>
      </section>`;
  }

  function desenhar() {
    abas.hidden = false;
    botaoSair.hidden = false;
    abas.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", b.dataset.aba === aba ? "page" : "false"));
    if (aba === "funil") telaFunil();
    else if (aba === "acesso") telaAcesso();
    else telaRelatorio();
  }

  // ---------------------------------------------------------------- ações
  function baixarCsv() {
    const colunas = [
      ["Nome", (c) => c.nome],
      ["Telefone", (c) => foneBonito(c.telefone)],
      ["Imóvel", (c) => nomeImovel(c.imovelId)],
      ["Etapa", (c) => NOME_ETAPA[c.etapa]],
      ["Motivo (perdido)", (c) => c.motivoPerda],
      ["Como chegou", (c) => c.temperatura],
      ["1º contato", (c) => quando(c.primeiroContato || c.criadoEm)],
      ["1ª resposta dela", (c) => quando(c.primeiraRespostaEm)],
      ["Última interação", (c) => quando(c.ultimaInteracao)],
      ["Próximo lembrete", (c) => quando(c.proximoFollowup)],
      ["Resumo", (c) => c.resumo],
      ["Anotações", (c) => c.anotacoes],
    ];
    const celula = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita fórmula maliciosa na planilha
      return `"${s.replace(/"/g, '""')}"`;
    };
    const linhas = [colunas.map(([nome]) => celula(nome)).join(";"), ...dados.clientes.map((c) => colunas.map(([, f]) => celula(f(c))).join(";"))];
    const blob = new Blob([`﻿${linhas.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clientes-copiloto-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  async function salvarFicha(id) {
    const c = dados.clientes.find((x) => x.id === id);
    const caixa = painel.querySelector(`.editar[data-id="${CSS.escape(id)}"]`);
    if (!c || !caixa) return;
    const agora = new Date().toISOString();
    const novaEtapa = caixa.querySelector('[data-campo="etapa"]').value;
    const atualizado = structuredClone(c);
    if (novaEtapa !== c.etapa) {
      atualizado.etapa = novaEtapa;
      atualizado.historico = [...(c.historico || []), { tipo: `etapa:${novaEtapa}`, em: agora }];
      if (!ATIVAS.has(novaEtapa)) {
        atualizado.proximoFollowup = null;
        atualizado.aguardandoDesde = null;
      }
    }
    atualizado.motivoPerda = caixa.querySelector('[data-campo="motivoPerda"]').value.trim() || null;
    atualizado.anotacoes = caixa.querySelector('[data-campo="anotacoes"]').value.trim();
    atualizado.atualizadoEm = agora;
    try {
      await api("/api/clientes", { metodo: "PUT", corpo: { clientes: [atualizado] } });
      Object.assign(c, atualizado);
      aviso("Salvo ✓");
      desenhar();
    } catch {
      aviso("Não consegui salvar. Tente de novo.");
    }
  }

  async function apagarFicha(id) {
    const c = dados.clientes.find((x) => x.id === id);
    if (!c || !confirm(`Apagar todos os dados de ${nomeCliente(c)}? Isso não pode ser desfeito.`)) return;
    try {
      await api(`/api/clientes?id=${encodeURIComponent(id)}`, { metodo: "DELETE" });
      dados.clientes = dados.clientes.filter((x) => x.id !== id);
      aviso("Apagado ✓");
      desenhar();
    } catch {
      aviso("Não consegui apagar. Tente de novo.");
    }
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, a");
    if (!el) return;
    if (el.dataset.aba) { aba = el.dataset.aba; desenhar(); return; }
    if (el.dataset.periodo) { periodoEscolhido = el.dataset.periodo; desenhar(); return; }
    if (el.dataset.salvar) { salvarFicha(el.dataset.salvar); return; }
    if (el.dataset.apagar) { apagarFicha(el.dataset.apagar); return; }
    if (el.dataset.copiar) {
      navigator.clipboard?.writeText(el.dataset.copiar).then(() => aviso("Link copiado ✓"), () => aviso("Selecione o link e copie manualmente."));
      return;
    }
    if (el.id === "baixar-csv") baixarCsv();
    if (el.id === "sair") {
      gravarCodigo(null);
      codigo = null;
      dados = null;
      telaLogin();
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id !== "busca") return;
    busca = e.target.value;
    const pos = e.target.selectionStart;
    telaFunil();
    const campo = document.getElementById("busca");
    campo.focus();
    campo.setSelectionRange(pos, pos);
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "form-login") return;
    e.preventDefault();
    const tentativa = document.getElementById("codigo-admin").value.trim();
    if (!tentativa) return;
    try {
      dados = await api("/api/gestor", { codigo: tentativa });
      codigo = tentativa;
      gravarCodigo(codigo);
      desenhar();
    } catch (erro) {
      telaLogin(erro.status === 401 ? "Código incorreto." : "Não consegui conectar. Tente de novo.");
    }
  });

  async function iniciar() {
    try {
      imoveis = await (await fetch("/imoveis.json", { cache: "no-cache" })).json();
    } catch {
      imoveis = [];
    }
    if (!codigo) return telaLogin();
    try {
      dados = await api("/api/gestor");
      desenhar();
    } catch (erro) {
      if (erro.status === 401) {
        gravarCodigo(null);
        codigo = null;
        telaLogin("Código expirado ou incorreto.");
      } else {
        painel.innerHTML = `<div class="cartao"><p class="erro">Não consegui carregar os dados agora.</p><div class="acoes"><button class="botao" type="button" id="recarregar">Tentar de novo</button></div></div>`;
        document.getElementById("recarregar").onclick = iniciar;
      }
    }
  }

  iniciar();
})();
