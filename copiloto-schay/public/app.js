/* Copiloto da Schay — app do celular.
   Sem dependências e sem etapa de build: HTML, CSS e JavaScript puros. */
"use strict";

(() => {
  // ================================================================
  // 1. Utilidades
  // ================================================================
  const NOME = "Schay";
  const CHAVES = {
    codigo: "copiloto.codigo",
    clientes: "copiloto.clientes",
    pendentes: "copiloto.pendentes",
    passeio: "copiloto.passeioVisto",
  };

  const guardar = {
    ler(chave, padrao) {
      try {
        const v = localStorage.getItem(chave);
        return v === null ? padrao : JSON.parse(v);
      } catch {
        return padrao;
      }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço ou modo privado */ }
    },
    apagar(chave) {
      try { localStorage.removeItem(chave); } catch { /* ignorar */ }
    },
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString();
  const DIA = 86_400_000;
  const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

  function inicioDoDia(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function diasEntre(a, b) {
    return Math.round((inicioDoDia(b) - inicioDoDia(a)) / DIA);
  }

  function horaTexto(d) {
    const h = d.getHours();
    const m = d.getMinutes();
    return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  }

  function diaTexto(d) {
    const dif = diasEntre(new Date(), d);
    if (dif === 0) return "hoje";
    if (dif === 1) return "amanhã";
    if (dif === -1) return "ontem";
    if (dif > 1 && dif < 7) return SEMANA[d.getDay()];
    return `dia ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const quandoTexto = (valor) => {
    const d = new Date(valor);
    return `${diaTexto(d)} às ${horaTexto(d)}`;
  };

  function haQuantoTempo(valor) {
    const min = Math.max(0, Math.round((Date.now() - Date.parse(valor)) / 60_000));
    if (min < 2) return "agora há pouco";
    if (min < 60) return `há ${min} minutos`;
    const h = Math.round(min / 60);
    if (h < 24) return h === 1 ? "há 1 hora" : `há ${h} horas`;
    const d = Math.round(h / 24);
    return d === 1 ? "há 1 dia" : `há ${d} dias`;
  }

  function saudacao() {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  }

  const soNumeros = (s) => String(s ?? "").replace(/\D/g, "");

  function foneWhats(t) {
    let n = soNumeros(t);
    if (n.length === 10 || n.length === 11) n = `55${n}`;
    return n.length >= 12 && n.length <= 13 ? n : null;
  }

  function foneBonito(t) {
    let n = soNumeros(t);
    if (n.length > 11 && n.startsWith("55")) n = n.slice(2);
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return t || "";
  }

  const mesmoFone = (a, b) => {
    const x = soNumeros(a);
    const y = soNumeros(b);
    return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
  };

  const normNome = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  function novoId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Mostra os dados de exemplo sem o aviso "EXEMPLO - SUBSTITUIR". */
  const semExemplo = (s) => String(s ?? "").replace(/EXEMPLO - SUBSTITUIR:?\s*(·\s*)?/g, "").replace(/^\(ex\.:\s*(.*)\)$/, "$1").trim();

  function linkWhats(telefone, texto) {
    const fone = foneWhats(telefone);
    if (fone) return `https://wa.me/${fone}`;
    return texto ? `https://wa.me/?text=${encodeURIComponent(texto)}` : "https://wa.me/";
  }

  /** Copia sem esperar (funciona no toque, antes de abrir o WhatsApp). */
  function copiarTexto(texto) {
    let ok = false;
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "-9999px";
      area.style.fontSize = "16px";
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, texto.length);
      ok = document.execCommand("copy");
      area.remove();
    } catch { /* tenta do outro jeito */ }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).catch(() => {});
      ok = true;
    }
    return ok;
  }

  let temporizadorAviso = null;
  function esconderAviso() {
    clearTimeout(temporizadorAviso);
    document.getElementById("aviso").hidden = true;
  }

  function aviso(texto, ms = 3400) {
    const el = document.getElementById("aviso");
    el.textContent = texto;
    el.hidden = false;
    el.style.animation = "none";
    void el.offsetWidth; // reinicia a animação
    el.style.animation = "";
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { el.hidden = true; }, ms);
  }

  function festa() {
    const caixa = document.createElement("div");
    caixa.className = "festa";
    caixa.setAttribute("aria-hidden", "true");
    const pecas = ["🎉", "✨", "🏠", "💛", "🎊", "⭐"];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement("span");
      s.textContent = pecas[i % pecas.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * 0.8}s`;
      s.style.fontSize = `${22 + Math.random() * 22}px`;
      caixa.appendChild(s);
    }
    document.body.appendChild(caixa);
    setTimeout(() => caixa.remove(), 3800);
  }

  // ================================================================
  // 2. Dados guardados no aparelho (+ cópia no servidor)
  // ================================================================
  let codigo = null;
  let suporte = null;
  let imoveis = [];
  let clientes = guardar.ler(CHAVES.clientes, []);
  if (!Array.isArray(clientes)) clientes = [];
  const pendentes = new Set(guardar.ler(CHAVES.pendentes, []));
  let pedidoInstalar = null;

  const acharPorId = (id) => clientes.find((c) => c.id === id) || null;

  function persistir() {
    guardar.gravar(CHAVES.clientes, clientes);
    guardar.gravar(CHAVES.pendentes, [...pendentes]);
  }

  function salvarCliente(c) {
    c.atualizadoEm = iso(new Date());
    if (!acharPorId(c.id)) clientes.push(c);
    pendentes.add(c.id);
    persistir();
    agendarSincronia();
  }

  const nomeDoCliente = (c) => c.nome || (c.telefone ? foneBonito(c.telefone) : "Cliente sem nome");
  const inicial = (c) => (c.nome || "?").trim().charAt(0).toUpperCase() || "?";
  const imovelPorId = (id) => imoveis.find((i) => i.id === id) || null;
  const nomeImovel = (id) => {
    const i = imovelPorId(id);
    return i ? semExemplo(i.titulo) : "";
  };

  // ---------- API ----------
  async function api(caminho, { metodo = "GET", corpo, codigoTeste } = {}) {
    let resposta;
    try {
      resposta = await fetch(caminho, {
        method: metodo,
        headers: { "content-type": "application/json", "x-codigo": codigoTeste ?? codigo ?? "" },
        body: corpo ? JSON.stringify(corpo) : undefined,
        cache: "no-store",
      });
    } catch {
      const erro = new Error("offline");
      erro.codigo = "offline";
      throw erro;
    }
    let dados = null;
    try { dados = await resposta.json(); } catch { /* resposta vazia */ }
    if (!resposta.ok || !dados?.ok) {
      const erro = new Error(dados?.erro || "falha");
      erro.codigo = resposta.status === 401 ? "acesso_negado" : dados?.erro || "falha";
      throw erro;
    }
    return dados;
  }

  // ---------- Sincronia com o servidor ----------
  let temporizadorSincronia = null;
  let sincronizando = false;
  let ultimaBusca = 0;

  function agendarSincronia(ms = 900) {
    clearTimeout(temporizadorSincronia);
    temporizadorSincronia = setTimeout(sincronizar, ms);
  }

  const paraServidor = ({ sugestao, ...resto }) => resto; // a sugestão fica só no aparelho

  function mesclar(remoto) {
    const local = acharPorId(remoto.id);
    if (!local) {
      clientes.push(remoto);
    } else if (Date.parse(remoto.atualizadoEm) > Date.parse(local.atualizadoEm)) {
      Object.assign(local, remoto, { sugestao: local.sugestao });
    }
  }

  async function sincronizar({ buscar = false } = {}) {
    if (!codigo || sincronizando || navigator.onLine === false) return;
    sincronizando = true;
    try {
      const ids = [...pendentes];
      if (ids.length) {
        const lista = ids.map(acharPorId).filter(Boolean).map(paraServidor);
        const r = await api("/api/clientes", { metodo: "PUT", corpo: { clientes: lista } });
        ids.forEach((id) => pendentes.delete(id));
        (r.maisNovosNoServidor || []).forEach(mesclar);
        persistir();
      }
      if (buscar || Date.now() - ultimaBusca > 5 * 60_000) {
        const r = await api("/api/clientes");
        ultimaBusca = Date.now();
        const noServidor = new Set();
        for (const remoto of r.clientes || []) {
          noServidor.add(remoto.id);
          mesclar(remoto);
        }
        // Cliente apagado pelo gestor (pedido de exclusão) some do aparelho também.
        clientes = clientes.filter((c) => noServidor.has(c.id) || pendentes.has(c.id));
        persistir();
        if (["inicio", "chamar", "clientes"].includes(telaAtual.nome)) desenhar();
      }
    } catch (erro) {
      if (erro.codigo === "acesso_negado") perdeuAcesso();
    } finally {
      sincronizando = false;
      if (pendentes.size && navigator.onLine !== false) agendarSincronia(30_000);
    }
  }

  // ================================================================
  // 3. Regras de cada cliente (o app decide a etapa sozinho)
  // ================================================================
  const ORDEM = ["novo", "conversando", "visita_marcada", "proposta"];
  const ESTADOS = {
    novo: "Novo",
    conversando: "Conversando",
    visita_marcada: "Visita marcada",
    proposta: "Fez proposta",
    vendido: "Comprou 🎉",
    perdido: "Desistiu",
  };
  const INTERVALO_RETOMADA = { 1: 2, 2: 4, 3: 7 }; // D+1 → D+3 → D+7 → D+14

  function mudarEtapa(c, etapa, quando = new Date()) {
    if (c.etapa === etapa) return;
    c.etapa = etapa;
    c.historico.push({ tipo: `etapa:${etapa}`, em: iso(quando) });
  }

  function avancarEtapa(c, alvo, quando) {
    if (alvo === "perdido") return mudarEtapa(c, "perdido", quando);
    if (c.etapa === "vendido") return;
    if (alvo === "vendido") alvo = "proposta"; // venda só com o botão "Comprou"
    const destino = Math.max(0, ORDEM.indexOf(alvo));
    if (c.etapa === "perdido") {
      c.motivoPerda = null;
      c.historico.push({ tipo: "voltou", em: iso(quando) });
      c.etapa = "novo";
      for (let i = 1; i <= Math.max(1, destino); i++) mudarEtapa(c, ORDEM[i], quando);
      return;
    }
    for (let i = ORDEM.indexOf(c.etapa) + 1; i <= destino; i++) mudarEtapa(c, ORDEM[i], quando);
  }

  function dataLembrete(dias, hora = "10:00") {
    const [h, m] = String(hora).split(":").map(Number);
    const d = new Date();
    d.setDate(d.getDate() + (Number.isFinite(dias) ? dias : 1));
    d.setHours(Number.isFinite(h) ? h : 10, Number.isFinite(m) ? m : 0, 0, 0);
    if (d.getTime() < Date.now() + 45 * 60_000) d.setDate(d.getDate() + 1);
    return d;
  }

  function acharCliente({ nome, telefone }) {
    if (telefone) {
      const porFone = clientes.find((c) => c.telefone && mesmoFone(c.telefone, telefone));
      if (porFone) return porFone;
    }
    const n = normNome(nome);
    if (n.length >= 2) {
      return clientes.find((c) => normNome(c.nome) === n && !(c.telefone && telefone && !mesmoFone(c.telefone, telefone))) || null;
    }
    return null;
  }

  /** Cria ou atualiza o cliente com o que a IA leu da conversa. Salvar é automático. */
  function registrarConversa(f, r) {
    const agora = new Date();
    let c = (f.clienteId && acharPorId(f.clienteId)) || acharCliente(r.cliente);
    if (!c) {
      let primeiro = agora;
      if (r.momento === "primeiro_contato" && r.hora_primeira_mensagem_hoje) {
        const [h, m] = r.hora_primeira_mensagem_hoje.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        if (d <= agora) primeiro = d;
      }
      c = {
        id: novoId(),
        nome: "",
        telefone: null,
        imovelId: null,
        etapa: "novo",
        motivoPerda: null,
        temperatura: null,
        resumo: "",
        anotacoes: "",
        criadoEm: iso(agora),
        primeiroContato: iso(primeiro),
        primeiraRespostaEm: null,
        medirResposta: r.momento === "primeiro_contato",
        ultimaInteracao: null,
        aguardandoDesde: null,
        proximoFollowup: null,
        followupMotivo: null,
        followupMensagem: "",
        tentativas: 0,
        visitaEm: null,
        historico: [{ tipo: "chegou", em: iso(primeiro) }],
      };
    }
    if (!c.nome && r.cliente.nome) c.nome = r.cliente.nome;
    if (!c.telefone && r.cliente.telefone) c.telefone = r.cliente.telefone;
    c.imovelId = r.imovel_id || f.imovelId || c.imovelId;
    c.temperatura = r.temperatura;
    if (r.resumo) c.resumo = r.resumo;
    avancarEtapa(c, r.etapa, agora);
    if (c.etapa === "perdido") c.motivoPerda = r.pediu_para_parar ? "Pediu para não ser chamado" : c.motivoPerda || "Desistiu na conversa";
    c.ultimaInteracao = iso(agora);
    c.aguardandoDesde = c.etapa === "perdido" ? null : c.aguardandoDesde || iso(agora);
    c.momentoUltimo = r.momento;
    if (r.followup.precisa && c.etapa !== "perdido") {
      c.proximoFollowup = iso(dataLembrete(r.followup.dias, r.followup.hora));
      c.followupMotivo = "retomar";
      c.followupMensagem = r.followup.mensagem;
    } else {
      c.proximoFollowup = null;
      c.followupMotivo = null;
      c.followupMensagem = "";
    }
    c.sugestao = { principal: r.respostas[0], alternativa: r.respostas[1] || null, em: iso(agora) };
    salvarCliente(c);
    return c;
  }

  /** Ela mandou a mensagem para o cliente (copiou ou tocou em "Já chamei"). */
  function registrarEnvio(c, agora = new Date()) {
    c.ultimaInteracao = iso(agora);
    c.aguardandoDesde = null;
    if (!c.primeiraRespostaEm) c.primeiraRespostaEm = iso(agora);
    c.historico.push({ tipo: "enviou", em: iso(agora) });
  }

  /** Por que esse cliente está na lista de hoje (ou null se não está). */
  function motivoParaChamar(c) {
    if (c.etapa === "vendido" || c.etapa === "perdido") return null;
    if (c.aguardandoDesde) return { tipo: "esperando", ordem: Date.parse(c.aguardandoDesde) };
    if (c.proximoFollowup) {
      const quando = Date.parse(c.proximoFollowup);
      const fimDeHoje = inicioDoDia(new Date()).getTime() + DIA;
      if (quando < fimDeHoje) return { tipo: c.followupMotivo === "pos_visita" ? "visita" : "retomar", ordem: 1e13 + quando };
    }
    return null;
  }

  const listaDeHoje = () =>
    clientes
      .map((c) => ({ c, m: motivoParaChamar(c) }))
      .filter((x) => x.m)
      .sort((a, b) => a.m.ordem - b.m.ordem);

  function contextoParaIA(c, comRetomada) {
    if (!c) return null;
    const visita = c.visitaEm ? new Date(c.visitaEm) : null;
    return {
      nome: c.nome || null,
      resumo: c.resumo || null,
      etapa: c.etapa,
      temperatura: c.temperatura,
      diasSemContato: c.ultimaInteracao ? diasEntre(new Date(c.ultimaInteracao), new Date()) : null,
      tentativas: c.tentativas || 0,
      motivo: comRetomada ? (c.followupMotivo === "pos_visita" ? "pos_visita" : "retomar") : null,
      visitaEm: visita ? `${diaTexto(visita)} às ${horaTexto(visita)}` : null,
      mensagemPlanejada: comRetomada ? c.followupMensagem || null : null,
    };
  }

  // ================================================================
  // 4. Fotos: reduz no próprio celular (~1500 px) e manda em base64.
  //    A imagem não é guardada em lugar nenhum.
  // ================================================================
  function carregarImagem(arquivo) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
      img.src = url;
    });
  }

  async function prepararImagem(arquivo) {
    let fonte;
    let largura;
    let altura;
    try {
      fonte = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
      largura = fonte.width;
      altura = fonte.height;
    } catch {
      fonte = await carregarImagem(arquivo);
      largura = fonte.naturalWidth;
      altura = fonte.naturalHeight;
    }
    const escala = Math.min(1, 1500 / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
    fonte.close?.();
    const url = canvas.toDataURL("image/jpeg", 0.85);
    return { tipo: "image/jpeg", dados: url.slice(url.indexOf(",") + 1), previa: url };
  }

  // ================================================================
  // 5. Navegação (o botão "voltar" do celular também funciona)
  // ================================================================
  const app = document.getElementById("app");
  let telaAtual = { nome: "inicio", params: {} };
  let passeio = null; // índice do mini tour, ou null

  function ir(nome, params = {}) {
    const n = (history.state?.n ?? 0) + 1;
    history.pushState({ nome, params, n }, "");
    telaAtual = { nome, params };
    desenhar(true);
  }

  function trocar(nome, params = {}) {
    history.replaceState({ nome, params, n: history.state?.n ?? 0 }, "");
    telaAtual = { nome, params };
    desenhar(true);
  }

  function voltar() {
    if ((history.state?.n ?? 0) > 0) history.back();
    else trocar("inicio");
  }

  function irInicio() {
    const n = history.state?.n ?? 0;
    if (n > 0) history.go(-n);
    else trocar("inicio");
  }

  addEventListener("popstate", (e) => {
    telaAtual = e.state ? { nome: e.state.nome, params: e.state.params || {} } : { nome: "inicio", params: {} };
    desenhar(true);
  });

  let pararFrases = null;
  function desenhar(rolarParaCima = false) {
    if (pararFrases) { pararFrases(); pararFrases = null; }
    const tela = TELAS[telaAtual.nome] || TELAS.inicio;
    app.innerHTML = tela(telaAtual.params) + (passeio !== null ? telaPasseio() : "");
    if (rolarParaCima) window.scrollTo(0, 0);
    const frase = app.querySelector("[data-frases]");
    if (frase) pararFrases = girarFrases(frase);
    const foco = app.querySelector("[data-foco]");
    if (foco) foco.focus({ preventScroll: true });
  }

  function girarFrases(el) {
    const frases = el.dataset.frases.split("|");
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % frases.length;
      el.textContent = frases[i];
    }, 2600);
    return () => clearInterval(id);
  }

  // ================================================================
  // 6. Pedaços de tela
  // ================================================================
  const MARCA = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 22 24 9l16 13" fill="none" stroke="#C9A24A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 20v17h22V20" fill="none" stroke="#F6EBCD" stroke-width="3.5" stroke-linejoin="round"/><path d="M19 27h10a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-5l-4 3v-3h-1a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3z" fill="#C9A24A"/></svg>`;
  const ICONE_WHATS = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5.1 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>`;

  function barra({ passo = 0, voltarPara } = {}) {
    const trilho = passo
      ? `<div class="passos" aria-label="Passo ${passo} de 3"><span>Passo ${passo} de 3</span><span class="trilho" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= passo ? "feito" : ""}"></i>`).join("")}</span></div>`
      : "";
    return `<nav class="barra"><button class="voltar" type="button" data-acao="${voltarPara || "voltar"}"><span aria-hidden="true">←</span> Voltar</button>${trilho}</nav>`;
  }

  function telaPensando(titulo = "Pensando na melhor resposta…", passo = 3) {
    const frases = ["Lendo a conversa com carinho…", "Entendendo o que o cliente quer…", "Escrevendo a melhor resposta para você…", "Quase pronto…"];
    return `<section class="tela">${barra({ passo })}
      <div class="pensando" role="status">
        <div class="balao-digitando" aria-hidden="true"><span></span><span></span><span></span></div>
        <h1>${esc(titulo)}</h1>
        <p data-frases="${esc(frases.join("|"))}">${esc(frases[0])}</p>
      </div></section>`;
  }

  const MENSAGENS_ERRO = {
    offline: ["📶", "Parece que a internet caiu", "Confira o Wi-Fi ou os dados do celular e toque no botão para tentar de novo."],
    devagar: ["⏳", "Foram muitos pedidos seguidos", "Espere 1 minutinho e toque no botão para tentar de novo."],
    acesso_negado: ["🔑", "Seu acesso precisa ser renovado", "Peça um novo link para o seu gestor e abra ele aqui no celular."],
    imagem_invalida: ["🖼️", "Não consegui abrir essa foto", "Volte e escolha a foto de novo, por favor."],
    muitas_imagens: ["🖼️", "Fotos demais de uma vez", "Escolha no máximo 4 fotos da conversa."],
    sem_chave: ["🛠️", "O app ainda não está pronto", "Avise o seu gestor: falta configurar uma parte do sistema."],
  };

  function telaOps(codigoErro, acaoTentar, passo = 0) {
    const [emoji, titulo, texto] = MENSAGENS_ERRO[codigoErro] || ["😕", "Ops, não consegui agora", "Toque no botão abaixo para tentar de novo."];
    return `<section class="tela">${barra({ passo })}
      <div class="conteudo"><div class="ops" role="alert">
        <div class="emoji" aria-hidden="true">${emoji}</div>
        <h1>${esc(titulo)}</h1>
        <p>${esc(texto)}</p>
      </div>
      ${codigoErro === "acesso_negado" || codigoErro === "sem_chave" ? "" : `<button class="botao forte" type="button" data-acao="${acaoTentar}" data-foco>Toque aqui para tentar de novo</button>`}
      <button class="botao claro" type="button" data-acao="inicio">Voltar ao início</button>
      </div></section>`;
  }

  /** Balão de mensagem + botão verde de copiar. */
  function blocoResposta(resposta, telefone, indice, origem) {
    if (resposta.tipo === "audio") {
      return `<div class="pilha">
        <div class="conversa-fundo"><div class="titulo-audio"><span aria-hidden="true">🎤</span> Grave um áudio curto (até 20 segundos) falando mais ou menos assim:</div>
        <div class="balao audio">${esc(resposta.texto)}</div></div>
        <a class="botao whats" href="${esc(linkWhats(telefone))}" target="_blank" rel="noopener noreferrer" data-acao="abrir-audio" data-origem="${origem}">${ICONE_WHATS} ABRIR O WHATSAPP PARA GRAVAR</a>
      </div>`;
    }
    return `<div class="pilha">
      <div class="conversa-fundo"><div class="balao">${esc(resposta.texto)}<span class="hora" aria-hidden="true">${new Date().toTimeString().slice(0, 5)} ✓✓</span></div></div>
      <a class="botao whats" href="${esc(linkWhats(telefone, resposta.texto))}" target="_blank" rel="noopener noreferrer" data-acao="copiar" data-indice="${indice}" data-origem="${origem}">${ICONE_WHATS} COPIAR E ABRIR O WHATSAPP</a>
    </div>`;
  }

  const SELOS = {
    quente: ["🔥", "Quente"],
    morno: ["🙂", "Morno"],
    frio: ["❄️", "Frio"],
  };

  // Ilustração do passo 1: print da conversa → foto escolhida no app
  const ILUSTRACAO_PRINT = `<svg viewBox="0 0 360 200" role="img" aria-label="Tire um print da conversa no WhatsApp e escolha a foto no app">
    <rect x="18" y="8" width="112" height="184" rx="18" fill="#0E2A47"/><rect x="25" y="22" width="98" height="156" rx="8" fill="#EFE7DD"/>
    <rect x="25" y="22" width="98" height="22" rx="8" fill="#15803D"/><circle cx="38" cy="33" r="6" fill="#DCF8C6"/><rect x="48" y="29" width="40" height="7" rx="3" fill="#DCF8C6"/>
    <rect x="31" y="52" width="62" height="18" rx="6" fill="#fff"/><rect x="55" y="76" width="62" height="18" rx="6" fill="#DCF8C6"/>
    <rect x="31" y="100" width="70" height="18" rx="6" fill="#fff"/><rect x="47" y="124" width="70" height="26" rx="6" fill="#DCF8C6"/>
    <rect x="31" y="156" width="54" height="16" rx="6" fill="#fff"/>
    <g stroke="#C9A24A" stroke-width="4" stroke-linecap="round"><path d="M12 30 4 22M12 100H2M12 170l-8 8"/></g>
    <path d="M150 100h52" stroke="#C9A24A" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/><path d="m200 88 14 12-14 12" fill="none" stroke="#C9A24A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="232" y="40" width="112" height="120" rx="20" fill="#fff" stroke="#DCEBFA" stroke-width="4"/>
    <rect x="250" y="58" width="76" height="62" rx="10" fill="#DCEBFA"/><circle cx="270" cy="76" r="8" fill="#C9A24A"/><path d="m254 116 22-24 16 16 10-10 20 18z" fill="#2563A6"/>
    <circle cx="322" cy="136" r="16" fill="#15803D"/><path d="m314 136 6 6 10-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // ================================================================
  // 7. Telas
  // ================================================================
  let fluxo = null;   // "Responder um cliente" em andamento
  let retomada = null; // "Ver o que mandar" em andamento

  const TELAS = {
    inicio() {
      const n = listaDeHoje().length;
      return `<section class="tela">
        <header class="topo">
          <div class="topo-marca">${MARCA}<span>Copiloto de Vendas</span></div>
          <h1>${saudacao()}, ${esc(NOME)}! 👋</h1>
          <p>O que você quer fazer agora?</p>
        </header>
        <div class="botoes-inicio">
          <button class="escolha principal" type="button" data-acao="responder">
            <span class="icone" aria-hidden="true">📩</span>
            <span><strong>Responder um cliente</strong><span class="sub">Toque aqui quando um cliente te mandar mensagem</span></span>
          </button>
          <button class="escolha" type="button" data-acao="chamar">
            <span class="icone" aria-hidden="true">📞</span>
            <span><strong>Quem chamar hoje</strong><span class="sub">Toque aqui para ver quem está esperando seu retorno</span></span>
            ${n ? `<span class="bolinha" aria-label="${n} ${n === 1 ? "cliente esperando" : "clientes esperando"}">${n}</span>` : ""}
          </button>
          <button class="escolha discreta" type="button" data-acao="ajuda">
            <span class="icone" aria-hidden="true">❓</span>
            <span><strong>Preciso de ajuda</strong><span class="sub">Toque aqui para ver como usar ou falar com o suporte</span></span>
          </button>
        </div>
        <p class="rodape-inicio">Imobiliária Innovar · São Leopoldo</p>
      </section>`;
    },

    // ---------- Passo 1 ----------
    foto() {
      if (!fluxo) novoFluxo();
      const c = fluxo.clienteId ? acharPorId(fluxo.clienteId) : null;
      if (fluxo.modoTexto) {
        return `<section class="tela">${barra({ passo: 1 })}
          <div class="conteudo">
            <div class="titulo"><h1>Cole a conversa aqui</h1><p>No WhatsApp, segure o dedo em cima da mensagem do cliente, toque em <b>Copiar</b> e depois cole abaixo.</p></div>
            <label class="escondido" for="texto-conversa">Conversa com o cliente</label>
            <textarea id="texto-conversa" class="campo" placeholder="Toque aqui e escolha Colar" data-foco>${esc(fluxo.texto)}</textarea>
            <button class="botao forte" type="button" data-acao="usar-texto">Continuar →</button>
            <button class="link pequeno" type="button" data-acao="modo-foto">Prefere mandar a foto? Toque aqui</button>
          </div></section>`;
      }
      return `<section class="tela">${barra({ passo: 1 })}
        <div class="conteudo">
          <div class="titulo"><h1>Mande a foto da conversa</h1>${c ? `<p>Conversa com <b>${esc(nomeDoCliente(c))}</b></p>` : ""}</div>
          <div class="ilustracao">${ILUSTRACAO_PRINT}<p>Tire um print da conversa no WhatsApp e escolha aqui</p></div>
          <button class="botao forte gigante" type="button" data-acao="escolher-foto" data-foco><span class="emoji" aria-hidden="true">📷</span>Toque aqui para escolher a foto</button>
          <button class="link pequeno" type="button" data-acao="modo-texto">Prefere colar o texto? Toque aqui</button>
        </div></section>`;
    },

    // ---------- Passo 2 ----------
    imovel() {
      if (!fluxo) return TELAS.inicio();
      const previas = fluxo.imagens.length
        ? `<div class="fotos-escolhidas">${fluxo.imagens.map((i) => `<img src="${i.previa}" alt="">`).join("")}<span>✓ ${fluxo.imagens.length === 1 ? "Foto recebida" : `${fluxo.imagens.length} fotos recebidas`}</span></div>`
        : "";
      const cards = imoveis.map((i) => {
        const foto = i.foto ? (/^https?:|^\//.test(i.foto) ? i.foto : `/${i.foto}`) : "";
        const detalhes = [semExemplo(i.bairro), semExemplo(i.preco)].filter(Boolean).join(" · ");
        return `<button class="imovel" type="button" data-acao="escolher-imovel" data-id="${esc(i.id)}">
          ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : `<span class="icone-pular" aria-hidden="true">🏠</span>`}
          <span>${i.exemplo ? `<span class="etiqueta">EXEMPLO</span>` : ""}<strong>${esc(semExemplo(i.titulo))}</strong><span>${esc(detalhes)}</span></span>
        </button>`;
      }).join("");
      return `<section class="tela">${barra({ passo: 2 })}
        <div class="conteudo">
          <div class="titulo"><h1>Sobre qual imóvel ele perguntou?</h1><p>Toque no imóvel. Se não souber, toque em “Não sei”.</p></div>
          ${previas}
          <div class="lista-imoveis">${cards}
            <button class="imovel pular" type="button" data-acao="escolher-imovel" data-id="">
              <span class="icone-pular" aria-hidden="true">🤷</span>
              <span><strong>Não sei / pular</strong><span>O app tenta descobrir pela conversa</span></span>
            </button>
          </div>
        </div></section>`;
    },

    // ---------- Passo 3 ----------
    resultado() {
      if (!fluxo) return TELAS.inicio();
      if (fluxo.carregando) return telaPensando();
      if (fluxo.erro) return telaOps(fluxo.erro, "tentar-de-novo", 3);
      const r = fluxo.resultado;
      if (!r) return TELAS.inicio();
      const c = acharPorId(fluxo.clienteId);
      const [emoji, palavra] = SELOS[r.temperatura] || SELOS.morno;
      const outra = r.respostas[1];
      const lembrete = c?.proximoFollowup
        ? `<div class="cartao lembrete"><span class="emoji" aria-hidden="true">⏰</span><div>
            <strong>Se ele não responder:</strong><p>chamar de novo ${esc(quandoTexto(c.proximoFollowup))}</p>
            ${r.proximo_passo ? `<p class="objetivo">🎯 Seu objetivo agora: <b>${esc(r.proximo_passo)}</b></p>` : ""}
            <span class="ok-verde">✓ Lembrete criado</span></div></div>`
        : r.proximo_passo ? `<p class="objetivo">🎯 Seu objetivo agora: <b>${esc(r.proximo_passo)}</b></p>` : "";
      const pedirNome = c && !c.nome
        ? `<div class="cartao pilha"><h2>Qual o nome desse cliente?</h2><p class="objetivo">Para eu te lembrar dele depois.</p>
            <label class="escondido" for="nome-cliente">Nome do cliente</label>
            <input id="nome-cliente" class="campo" type="text" autocomplete="off" autocapitalize="words" placeholder="Toque aqui e escreva o nome">
            <button class="botao claro" type="button" data-acao="guardar-nome">Guardar o nome</button></div>`
        : "";
      return `<section class="tela">${barra({ passo: 3 })}
        <div class="conteudo">
          <div class="selo ${esc(r.temperatura)}"><span class="emoji" aria-hidden="true">${emoji}</span>
            <div><strong>Cliente ${palavra}</strong><p>${esc(r.leitura)}</p></div></div>
          <div class="responda"><h2>Responda assim:</h2>${blocoResposta(r.respostas[0], c?.telefone, 0, "fluxo")}</div>
          ${outra ? (fluxo.mostrarOutra
            ? `<div class="responda"><h2>Outra opção:</h2>${blocoResposta(outra, c?.telefone, 1, "fluxo")}</div>`
            : `<button class="link" type="button" data-acao="outra-opcao">Quero outra opção de resposta</button>`) : ""}
          ${pedirNome}
          ${lembrete}
          ${r.por_que ? `<div class="dica"><strong>💡 Dica</strong><p>${esc(r.por_que)}</p></div>` : ""}
          <button class="botao claro" type="button" data-acao="inicio">Voltar ao início</button>
        </div></section>`;
    },

    // ---------- Quem chamar hoje ----------
    chamar() {
      const lista = listaDeHoje();
      if (!lista.length) {
        return `<section class="tela">${barra()}
          <div class="conteudo"><div class="vazio"><div class="emoji" aria-hidden="true">🎉</div><h1>Tudo em dia!</h1><p>Ninguém esperando você agora. Quando um cliente mandar mensagem, toque em “Responder um cliente”.</p></div>
          <button class="botao forte" type="button" data-acao="inicio">Voltar ao início</button>
          ${clientes.length ? `<button class="link pequeno" type="button" data-acao="clientes">Ver todos os meus clientes</button>` : ""}
          </div></section>`;
      }
      const cards = lista.map(({ c, m }) => {
        let situacao;
        if (m.tipo === "esperando") situacao = `<p class="situacao urgente">⏳ Esperando sua resposta ${esc(haQuantoTempo(c.aguardandoDesde))}</p>`;
        else if (m.tipo === "visita") situacao = `<p class="situacao visita">🏠 Teve visita: pergunte o que ele achou</p>`;
        else {
          const dias = c.ultimaInteracao ? diasEntre(new Date(c.ultimaInteracao), new Date()) : 0;
          situacao = `<p class="situacao hoje">📅 ${dias <= 0 ? "Combinado chamar hoje" : dias === 1 ? "Faz 1 dia que vocês não se falam" : `Faz ${dias} dias que vocês não se falam`}</p>`;
        }
        return `<article class="pessoa">
          <div class="pessoa-topo"><span class="avatar" aria-hidden="true">${esc(inicial(c))}</span>
            <div><h2>${esc(nomeDoCliente(c))}</h2>${c.imovelId ? `<p class="imovel-nome">${esc(nomeImovel(c.imovelId))}</p>` : ""}</div></div>
          ${situacao}
          <button class="botao forte" type="button" data-acao="ver-o-que-mandar" data-id="${esc(c.id)}">Ver o que mandar →</button>
        </article>`;
      }).join("");
      return `<section class="tela">${barra()}
        <div class="conteudo">
          <div class="titulo"><h1>Quem chamar hoje</h1><p>${lista.length === 1 ? "1 cliente esperando você" : `${lista.length} clientes esperando você`}</p></div>
          <div class="lista-chamar">${cards}</div>
          <button class="link pequeno" type="button" data-acao="clientes">Ver todos os meus clientes</button>
        </div></section>`;
    },

    // ---------- Ver o que mandar (retomar contato) ----------
    retomar(params) {
      const c = acharPorId(params.id);
      if (!c || !retomada || retomada.clienteId !== c.id) return TELAS.chamar();
      if (retomada.carregando) return telaPensando("Preparando a mensagem…", 0);
      if (retomada.erro) return telaOps(retomada.erro, "tentar-retomada");
      const r = retomada.resultado;
      const outra = r.respostas[1];
      const m = motivoParaChamar(c);
      const titulo = m?.tipo === "visita" ? "Pergunte o que ele achou da visita" : m?.tipo === "esperando" ? "Responda o cliente" : "Chame o cliente de novo";
      return `<section class="tela">${barra()}
        <div class="conteudo">
          <div class="titulo"><h1>${esc(nomeDoCliente(c))}</h1><p>${esc(titulo)}</p></div>
          <div class="responda"><h2>Mande assim:</h2>${blocoResposta(r.respostas[0], c.telefone, 0, "retomada")}</div>
          ${outra ? (retomada.mostrarOutra
            ? `<div class="responda"><h2>Outra opção:</h2>${blocoResposta(outra, c.telefone, 1, "retomada")}</div>`
            : `<button class="link" type="button" data-acao="outra-opcao-retomada">Quero outra opção de resposta</button>`) : ""}
          <button class="botao ${retomada.copiou ? "forte destaque" : "claro"}" type="button" data-acao="ja-chamei">✓ Já chamei</button>
          ${r.por_que ? `<div class="dica"><strong>💡 Dica</strong><p>${esc(r.por_que)}</p></div>` : ""}
          ${blocoNovidades(c)}
          <button class="link pequeno" type="button" data-acao="nova-conversa" data-id="${esc(c.id)}">Ele respondeu? Toque aqui e mande a foto da conversa</button>
        </div></section>`;
    },

    // ---------- Todos os clientes ----------
    clientes() {
      const ativos = clientes.filter((c) => c.etapa !== "vendido" && c.etapa !== "perdido");
      const fechados = clientes.filter((c) => c.etapa === "vendido" || c.etapa === "perdido");
      const porData = (a, b) => Date.parse(b.ultimaInteracao || b.criadoEm) - Date.parse(a.ultimaInteracao || a.criadoEm);
      const linha = (c) => `<button class="linha-cliente" type="button" data-acao="abrir-cliente" data-id="${esc(c.id)}">
          <span class="avatar" aria-hidden="true">${esc(inicial(c))}</span>
          <span><strong>${esc(nomeDoCliente(c))}</strong><span class="estado ${esc(c.etapa)}">${esc(ESTADOS[c.etapa] || "")}</span></span>
          <span class="seta" aria-hidden="true">›</span></button>`;
      return `<section class="tela">${barra()}
        <div class="conteudo">
          <div class="titulo"><h1>Meus clientes</h1><p>Toque em um cliente para ver ou marcar novidades.</p></div>
          ${clientes.length ? "" : `<div class="vazio"><div class="emoji" aria-hidden="true">📭</div><p>Ainda não tem nenhum cliente. Eles aparecem aqui sozinhos quando você responde alguém.</p></div>`}
          <div class="lista-chamar">${ativos.sort(porData).map(linha).join("")}</div>
          ${fechados.length ? `<h2 class="rotulo">Já resolvidos</h2><div class="lista-chamar">${fechados.sort(porData).map(linha).join("")}</div>` : ""}
        </div></section>`;
    },

    cliente(params) {
      const c = acharPorId(params.id);
      if (!c) return TELAS.clientes();
      const ativo = c.etapa !== "vendido" && c.etapa !== "perdido";
      return `<section class="tela">${barra()}
        <div class="conteudo">
          <div class="pessoa-topo"><span class="avatar" aria-hidden="true">${esc(inicial(c))}</span>
            <div class="titulo"><h1>${esc(nomeDoCliente(c))}</h1><span class="estado ${esc(c.etapa)}">${esc(ESTADOS[c.etapa] || "")}</span></div></div>
          <div class="cartao"><dl class="dados-cliente">
            ${c.telefone ? `<div><dt>Telefone</dt><dd><a href="${esc(linkWhats(c.telefone))}" target="_blank" rel="noopener noreferrer">${esc(foneBonito(c.telefone))}</a></dd></div>` : ""}
            ${c.imovelId ? `<div><dt>Imóvel</dt><dd>${esc(nomeImovel(c.imovelId))}</dd></div>` : ""}
            ${c.resumo ? `<div><dt>O que ele quer</dt><dd>${esc(c.resumo)}</dd></div>` : ""}
            ${c.visitaEm ? `<div><dt>Visita</dt><dd>${esc(quandoTexto(c.visitaEm))}</dd></div>` : ""}
            ${ativo ? `<div><dt>Próximo lembrete</dt><dd>${c.proximoFollowup ? esc(quandoTexto(c.proximoFollowup)) : "Nenhum"}</dd></div>` : ""}
            ${c.motivoPerda && c.etapa === "perdido" ? `<div><dt>Motivo</dt><dd>${esc(c.motivoPerda)}</dd></div>` : ""}
          </dl></div>
          ${ativo ? `<button class="botao forte" type="button" data-acao="ver-o-que-mandar" data-id="${esc(c.id)}">Ver o que mandar →</button>` : ""}
          <button class="botao claro" type="button" data-acao="nova-conversa" data-id="${esc(c.id)}">📷 Mandar foto de conversa nova</button>
          ${ativo ? blocoNovidades(c) : ""}
          <div class="cartao pilha"><label class="nome-campo" for="anotacoes">Anotações</label>
            <textarea id="anotacoes" class="campo" placeholder="Ex.: prefere falar depois das 18h">${esc(c.anotacoes)}</textarea>
            <button class="botao claro" type="button" data-acao="guardar-anotacoes" data-id="${esc(c.id)}">Guardar anotações</button>
            ${c.nome ? "" : `<label class="nome-campo" for="nome-cliente">Nome</label><input id="nome-cliente" class="campo" type="text" autocapitalize="words" placeholder="Escreva o nome"><button class="botao claro" type="button" data-acao="guardar-nome" data-id="${esc(c.id)}">Guardar o nome</button>`}
          </div>
        </div></section>`;
    },

    // ---------- Marcou visita ----------
    visita(params) {
      const c = acharPorId(params.id);
      if (!c) return TELAS.inicio();
      if (!params.dia && params.dia !== 0) {
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const rotulo = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${SEMANA[d.getDay()].replace("-feira", "")} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          return `<button class="botao claro" type="button" data-acao="visita-dia" data-dia="${i}">${esc(rotulo.charAt(0).toUpperCase() + rotulo.slice(1))}</button>`;
        }).join("");
        return `<section class="tela">${barra()}
          <div class="conteudo"><div class="titulo"><h1>Que dia é a visita? 🏠</h1><p>Com ${esc(nomeDoCliente(c))}</p></div>
          <div class="grade-2">${dias}</div></div></section>`;
      }
      const horas = ["09:00", "10:00", "11:00", "13:30", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
        .map((h) => `<button class="botao claro" type="button" data-acao="visita-hora" data-hora="${h}">${esc(horaTexto(new Date(`2000-01-01T${h}:00`)))}</button>`).join("");
      return `<section class="tela">${barra()}
        <div class="conteudo"><div class="titulo"><h1>Que horas? ⏰</h1><p>Visita com ${esc(nomeDoCliente(c))}</p></div>
        <div class="grade-2">${horas}</div></div></section>`;
    },

    // ---------- Comprou ----------
    comprou(params) {
      const c = acharPorId(params.id);
      if (!c) return TELAS.inicio();
      return `<section class="tela">${barra()}
        <div class="conteudo"><div class="vazio"><div class="emoji" aria-hidden="true">🎉</div><h1>${esc(nomeDoCliente(c))} comprou mesmo?</h1></div>
        <button class="botao forte" type="button" data-acao="confirmar-compra" data-id="${esc(c.id)}" data-foco>Sim, comprou! 🎉</button>
        <button class="botao claro" type="button" data-acao="voltar">Não, voltar</button></div></section>`;
    },

    // ---------- Desistiu ----------
    desistiu(params) {
      const c = acharPorId(params.id);
      if (!c) return TELAS.inicio();
      const motivos = ["Achou caro 💸", "Comprou outro imóvel", "Só estava olhando", "Parou de responder", "Não conseguiu financiamento", "Outro motivo"];
      return `<section class="tela">${barra()}
        <div class="conteudo"><div class="titulo"><h1>Por que ${esc(nomeDoCliente(c))} desistiu?</h1><p>Toque no motivo. Isso ajuda a melhorar os anúncios.</p></div>
        <div class="opcoes">${motivos.map((m) => `<button class="botao claro" type="button" data-acao="confirmar-desistiu" data-id="${esc(c.id)}" data-motivo="${esc(m.replace(/\s*💸/, ""))}">${esc(m)}</button>`).join("")}</div>
        </div></section>`;
    },

    // ---------- Ajuda ----------
    ajuda() {
      const passos = [
        ["Cliente mandou mensagem?", "No WhatsApp, tire um print da conversa (aperte o botão de ligar junto com o de abaixar o volume).", ILUSTRA_AJUDA[0]],
        ["Toque em “📩 Responder um cliente”", "Escolha a foto do print e o imóvel. O app pensa na melhor resposta.", ILUSTRA_AJUDA[1]],
        ["Toque no botão verde", "Ele copia a resposta e abre o WhatsApp. Lá, segure o dedo na caixa de mensagem e toque em Colar. Depois é só enviar.", ILUSTRA_AJUDA[2]],
        ["Todo dia, veja “📞 Quem chamar hoje”", "O app lembra quem está esperando você. Depois de mandar a mensagem, toque em “✓ Já chamei”.", ILUSTRA_AJUDA[3]],
      ];
      return `<section class="tela">${barra()}
        <div class="conteudo">
          <div class="titulo"><h1>Como usar o app</h1><p>São só 4 passos. Você consegue! 💛</p></div>
          ${passos.map(([t, d, svg], i) => `<div class="cartao passo-ajuda"><span class="numero" aria-hidden="true">${i + 1}</span><div><h2>${t}</h2><p>${d}</p>${svg}</div></div>`).join("")}
          ${suporte ? `<a class="botao whats" href="https://wa.me/${esc(suporte)}?text=${encodeURIComponent("Oi! Preciso de ajuda com o Copiloto de Vendas.")}" target="_blank" rel="noopener noreferrer">${ICONE_WHATS} Falar com o suporte</a>` : ""}
          ${pedidoInstalar ? `<button class="botao dourado" type="button" data-acao="instalar">📲 Colocar o app na tela do celular</button>` : `<a class="botao claro" href="/instalar">📲 Como colocar o app na tela do celular</a>`}
          <button class="link pequeno" type="button" data-acao="rever-passeio">Ver a apresentação de novo</button>
        </div></section>`;
    },

    // ---------- Acesso (sem código) ----------
    acesso(params) {
      return `<section class="tela acesso">
        <img class="logo" src="/icones/icone.svg" alt="">
        <h1>Olá, ${esc(NOME)}! 👋</h1>
        <p>Para entrar, abra o link que o seu gestor te mandou no WhatsApp.</p>
        ${params.erro ? `<p class="erro-texto" role="alert">${esc(params.erro)}</p>` : ""}
        <div class="divisor">ou</div>
        <label class="escondido" for="codigo-acesso">Código de acesso</label>
        <input id="codigo-acesso" class="campo" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite o código de acesso">
        <button class="botao forte" type="button" data-acao="entrar">Entrar</button>
      </section>`;
    },
  };

  function blocoNovidades(c) {
    return `<div class="novidades"><h2>Teve novidade com ${esc(nomeDoCliente(c).split(" ")[0])}?</h2>
      <button class="botao dourado" type="button" data-acao="marcou-visita" data-id="${esc(c.id)}">Marcou visita 🏠</button>
      <div class="grade-2">
        <button class="botao claro" type="button" data-acao="comprou" data-id="${esc(c.id)}">Comprou 🎉</button>
        <button class="botao claro" type="button" data-acao="desistiu" data-id="${esc(c.id)}">Desistiu</button>
      </div></div>`;
  }

  const ILUSTRA_AJUDA = [
    `<svg viewBox="0 0 320 120" aria-hidden="true"><rect width="320" height="120" rx="14" fill="#EEF5FD"/><rect x="110" y="10" width="100" height="100" rx="14" fill="#0E2A47"/><rect x="117" y="20" width="86" height="80" rx="6" fill="#EFE7DD"/><rect x="123" y="28" width="50" height="12" rx="4" fill="#fff"/><rect x="145" y="46" width="52" height="12" rx="4" fill="#DCF8C6"/><rect x="123" y="64" width="56" height="12" rx="4" fill="#fff"/><rect x="211" y="30" width="5" height="18" rx="2" fill="#C9A24A"/><rect x="211" y="56" width="5" height="26" rx="2" fill="#C9A24A"/><path d="M228 39h22M228 69h22" stroke="#C9A24A" stroke-width="4" stroke-linecap="round"/><text x="254" y="45" font-size="13" font-family="sans-serif" fill="#0E2A47">ligar</text><text x="254" y="75" font-size="13" font-family="sans-serif" fill="#0E2A47">volume −</text></svg>`,
    `<svg viewBox="0 0 320 120" aria-hidden="true"><rect width="320" height="120" rx="14" fill="#EEF5FD"/><rect x="30" y="22" width="260" height="76" rx="16" fill="#0E2A47"/><rect x="46" y="38" width="44" height="44" rx="12" fill="#17406B" stroke="#C9A24A" stroke-width="2"/><text x="56" y="69" font-size="24">📩</text><rect x="104" y="44" width="150" height="12" rx="5" fill="#fff"/><rect x="104" y="64" width="110" height="9" rx="4" fill="#9FB8D4"/></svg>`,
    `<svg viewBox="0 0 320 120" aria-hidden="true"><rect width="320" height="120" rx="14" fill="#EEF5FD"/><rect x="20" y="70" width="230" height="36" rx="18" fill="#fff" stroke="#D6E0EC" stroke-width="2"/><rect x="36" y="84" width="2" height="10" fill="#15803D"/><circle cx="276" cy="88" r="20" fill="#15803D"/><path d="m268 88 14-8v16z" fill="#fff"/><rect x="40" y="18" width="92" height="40" rx="10" fill="#13223A"/><path d="m78 58 8 8 8-8z" fill="#13223A"/><text x="60" y="44" font-size="16" font-family="sans-serif" font-weight="700" fill="#fff">Colar</text><circle cx="86" cy="88" r="11" fill="#C9A24A" opacity=".5"/></svg>`,
    `<svg viewBox="0 0 320 120" aria-hidden="true"><rect width="320" height="120" rx="14" fill="#EEF5FD"/><rect x="30" y="18" width="260" height="84" rx="16" fill="#fff" stroke="#D6E0EC" stroke-width="2"/><circle cx="66" cy="50" r="18" fill="#DCEBFA"/><text x="59" y="57" font-size="18" font-family="sans-serif" font-weight="800" fill="#0E2A47">A</text><rect x="94" y="38" width="90" height="12" rx="5" fill="#0E2A47"/><rect x="94" y="56" width="140" height="10" rx="4" fill="#FEE2E2"/><rect x="48" y="76" width="224" height="16" rx="8" fill="#0E2A47"/><circle cx="276" cy="24" r="14" fill="#D42A1E"/><text x="271" y="30" font-size="15" font-family="sans-serif" font-weight="800" fill="#fff">2</text></svg>`,
  ];

  // ---------- Mini tour do primeiro acesso ----------
  const PASSEIO = [
    ["📩", "Responder um cliente", "Cliente te mandou mensagem? Tire um print da conversa e toque aqui. Eu te mostro o que responder."],
    ["📞", "Quem chamar hoje", "Aqui ficam os clientes que estão esperando você. A bolinha vermelha mostra quantos são."],
    ["❓", "Preciso de ajuda", "Ficou com dúvida? Toque aqui para ver o passo a passo ou falar com o suporte."],
  ];

  function telaPasseio() {
    const [emoji, titulo, texto] = PASSEIO[passeio];
    const ultimo = passeio === PASSEIO.length - 1;
    return `<div class="passeio" role="dialog" aria-modal="true" aria-labelledby="titulo-passeio">
      <div class="passeio-cartao">
        <div class="emoji-grande" aria-hidden="true">${emoji}</div>
        <h2 id="titulo-passeio">${esc(titulo)}</h2>
        <p>${esc(texto)}</p>
        <div class="bolinhas-passeio" aria-hidden="true">${PASSEIO.map((_, i) => `<i class="${i === passeio ? "ativa" : ""}"></i>`).join("")}</div>
        <button class="botao forte" type="button" data-acao="passeio-ok" data-foco>${ultimo ? "Entendi, vamos começar!" : "Entendi"}</button>
      </div></div>`;
  }

  // ================================================================
  // 8. O que cada botão faz
  // ================================================================
  function novoFluxo(clienteId = null) {
    fluxo = { clienteId, imagens: [], texto: "", modoTexto: false, imovelId: null, especulativa: null, escolha: 0, registrado: null, resultado: null, erro: null, carregando: false, mostrarOutra: false, copiou: false };
  }

  function abrirSeletorFoto() {
    const input = document.getElementById("seletor-foto");
    input.value = "";
    input.click();
  }

  function pedirIA(f, imovelId) {
    const c = f.clienteId ? acharPorId(f.clienteId) : null;
    const corpo = {
      modo: "conversa",
      imagens: f.imagens.map(({ tipo, dados }) => ({ tipo, dados })),
      texto: f.texto,
      imovelId: imovelId || c?.imovelId || null,
      cliente: contextoParaIA(c, false),
    };
    return api("/api/responder", { metodo: "POST", corpo }).then(
      (d) => ({ resultado: d.resultado }),
      (e) => ({ erro: e.codigo || "falha" }),
    );
  }

  /** Começa a pensar já, enquanto ela escolhe o imóvel (a resposta chega mais rápido). */
  function conversaPronta() {
    fluxo.especulativa = pedirIA(fluxo, null);
    if (imoveis.length) ir("imovel");
    else escolherImovel("");
  }

  async function escolherImovel(id) {
    const f = fluxo;
    const minha = ++f.escolha;
    f.imovelId = id || null;
    f.carregando = true;
    f.erro = null;
    f.resultado = null;
    f.mostrarOutra = false;
    f.copiou = false;
    if (telaAtual.nome === "resultado") desenhar(true);
    else ir("resultado");
    let r = await f.especulativa;
    if (f !== fluxo || minha !== f.escolha) return;
    if (!r.erro && f.imovelId && r.resultado.imovel_id !== f.imovelId) {
      // Ela escolheu um imóvel diferente do que a conversa indicava: pensa de novo com o imóvel certo.
      f.especulativa = pedirIA(f, f.imovelId);
      r = await f.especulativa;
      if (f !== fluxo || minha !== f.escolha) return;
    }
    f.carregando = false;
    if (r.erro) {
      f.erro = r.erro;
      if (r.erro === "acesso_negado") return perdeuAcesso();
    } else {
      f.resultado = r.resultado;
      if (f.registrado !== r) {
        // Salva o cliente sozinho (uma vez por resposta, mesmo se ela voltar e escolher de novo).
        f.registrado = r;
        const c = registrarConversa(f, r.resultado);
        f.clienteId = c.id;
        setTimeout(() => aviso("Cliente salvo ✓"), 400);
      }
    }
    if (telaAtual.nome === "resultado") desenhar(true);
  }

  async function abrirRetomada(id) {
    const c = acharPorId(id);
    if (!c) return;
    const m = motivoParaChamar(c);
    // Cliente esperando resposta e a sugestão já está no aparelho: mostra na hora.
    if (m?.tipo === "esperando" && c.sugestao?.principal) {
      retomada = { clienteId: id, carregando: false, erro: null, mostrarOutra: false, copiou: false, guardada: true,
        resultado: { respostas: [c.sugestao.principal, c.sugestao.alternativa].filter(Boolean), por_que: "", followup: null } };
      return ir("retomar", { id });
    }
    if (m?.tipo === "esperando") {
      // Sem a sugestão neste aparelho: precisa ver a conversa de novo.
      novoFluxo(id);
      ir("foto");
      abrirSeletorFoto();
      return;
    }
    retomada = { clienteId: id, carregando: true, erro: null, mostrarOutra: false, copiou: false };
    ir("retomar", { id });
    await pedirRetomada();
  }

  async function pedirRetomada() {
    const atual = retomada;
    const c = acharPorId(atual.clienteId);
    atual.carregando = true;
    atual.erro = null;
    if (telaAtual.nome === "retomar") desenhar();
    try {
      const d = await api("/api/responder", { metodo: "POST", corpo: { modo: "retomar", imovelId: c.imovelId, cliente: contextoParaIA(c, true) } });
      atual.resultado = d.resultado;
    } catch (e) {
      atual.erro = e.codigo || "falha";
      if (atual.erro === "acesso_negado") return perdeuAcesso();
    }
    atual.carregando = false;
    if (retomada === atual && telaAtual.nome === "retomar") desenhar();
  }

  function jaChamei() {
    const c = acharPorId(retomada?.clienteId);
    if (!c) return voltar();
    const m = motivoParaChamar(c);
    const agora = new Date();
    const hora = retomada.resultado?.followup?.hora || "10:00";
    registrarEnvio(c, agora);
    let mensagem = "Feito ✓";
    if (m?.tipo === "esperando") {
      mensagem = c.proximoFollowup ? `Feito ✓ Se ele não responder, te lembro ${quandoTexto(c.proximoFollowup)}` : "Feito ✓";
    } else if (m?.tipo === "visita") {
      c.followupMotivo = "retomar";
      c.tentativas = 0;
      c.proximoFollowup = iso(dataLembrete(1, hora));
      c.followupMensagem = retomada.resultado?.followup?.mensagem || "";
      mensagem = `Feito ✓ Se ele não responder, te lembro ${quandoTexto(c.proximoFollowup)}`;
    } else {
      c.tentativas = (c.tentativas || 0) + 1;
      if (c.tentativas >= 4) {
        c.proximoFollowup = null;
        c.motivoPerda = "Parou de responder";
        mudarEtapa(c, "perdido", agora);
        mensagem = "Feito ✓ Ele saiu da sua lista. Se voltar a falar, é só mandar a foto da conversa.";
      } else {
        c.proximoFollowup = iso(dataLembrete(INTERVALO_RETOMADA[c.tentativas], hora));
        c.followupMotivo = "retomar";
        c.followupMensagem = retomada.resultado?.followup?.mensagem || "";
        mensagem = `Feito ✓ Vou te lembrar de novo ${quandoTexto(c.proximoFollowup)}`;
      }
    }
    salvarCliente(c);
    aviso(mensagem, 4200);
    retomada = null;
    voltar();
  }

  function perdeuAcesso() {
    codigo = null;
    guardar.apagar(CHAVES.codigo);
    trocar("acesso", { erro: "Seu acesso precisa ser renovado. Peça um novo link ao seu gestor." });
  }

  async function entrar() {
    const campo = document.getElementById("codigo-acesso");
    const tentativa = (campo?.value || "").trim();
    if (!tentativa) return campo?.focus();
    const botao = app.querySelector('[data-acao="entrar"]');
    botao.disabled = true;
    botao.textContent = "Conferindo…";
    try {
      const d = await api("/api/config", { codigoTeste: tentativa });
      codigo = tentativa;
      guardar.gravar(CHAVES.codigo, codigo);
      suporte = d.suporte;
      trocar("inicio");
      mostrarPasseioSeForPrimeiraVez();
      sincronizar({ buscar: true });
    } catch (e) {
      trocar("acesso", { erro: e.codigo === "offline" ? "Sem internet agora. Confira a conexão e tente de novo." : "Esse código não funcionou. Confira com o seu gestor." });
    }
  }

  function mostrarPasseioSeForPrimeiraVez() {
    if (!guardar.ler(CHAVES.passeio, false)) {
      passeio = 0;
      desenhar();
    }
  }

  const ACOES = {
    voltar,
    inicio: irInicio,
    responder() {
      novoFluxo();
      ir("foto");
      abrirSeletorFoto(); // já abre a galeria: um toque a menos
    },
    chamar: () => ir("chamar"),
    ajuda: () => ir("ajuda"),
    clientes: () => ir("clientes"),
    "escolher-foto": abrirSeletorFoto,
    "modo-texto"() {
      fluxo.modoTexto = true;
      desenhar();
    },
    "modo-foto"() {
      fluxo.modoTexto = false;
      desenhar();
    },
    "usar-texto"() {
      const texto = document.getElementById("texto-conversa")?.value || "";
      if (texto.trim().length < 3) {
        aviso("Cole a conversa na caixa antes de continuar 🙂");
        return;
      }
      fluxo.texto = texto;
      fluxo.imagens = [];
      conversaPronta();
    },
    "escolher-imovel": (el) => escolherImovel(el.dataset.id),
    "tentar-de-novo"() {
      fluxo.especulativa = pedirIA(fluxo, fluxo.imovelId);
      escolherImovel(fluxo.imovelId || "");
    },
    "outra-opcao"() {
      fluxo.mostrarOutra = true;
      desenhar();
      app.querySelectorAll(".responda")[1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    copiar(el) {
      const daRetomada = el.dataset.origem === "retomada";
      const fonte = daRetomada ? retomada : fluxo;
      const resposta = fonte?.resultado?.respostas?.[Number(el.dataset.indice) || 0];
      if (!resposta) return;
      const ok = copiarTexto(resposta.texto);
      const c = acharPorId(fonte.clienteId);
      const temFone = !!foneWhats(c?.telefone);
      aviso(ok ? (temFone ? "Copiado! ✓ Agora é só colar na conversa" : "Copiado! ✓ Escolha o cliente no WhatsApp e envie") : "Abrindo o WhatsApp…", 5000);
      if (!daRetomada && c && !fonte.copiou) {
        // Ela vai mandar agora: marca o retorno e tira da lista de espera.
        fonte.copiou = true;
        const retomando = c.momentoUltimo === "sumiu";
        registrarEnvio(c);
        c.tentativas = retomando ? (c.tentativas || 0) + 1 : 0;
        salvarCliente(c);
      }
      if (daRetomada && !fonte.copiou) {
        fonte.copiou = true;
        setTimeout(() => desenhar(), 600); // destaca o "✓ Já chamei"
      }
      // o próprio link abre o WhatsApp
    },
    "abrir-audio"(el) {
      const daRetomada = el.dataset.origem === "retomada";
      const fonte = daRetomada ? retomada : fluxo;
      if (fonte && !fonte.copiou) {
        fonte.copiou = true;
        if (daRetomada) setTimeout(() => desenhar(), 600);
      }
      aviso("Grave o áudio e envie 🎤", 4000);
    },
    "guardar-nome"(el) {
      const c = acharPorId(el.dataset.id || fluxo?.clienteId);
      const nome = (document.getElementById("nome-cliente")?.value || "").trim();
      if (!c || !nome) return;
      c.nome = nome.slice(0, 60);
      salvarCliente(c);
      aviso("Cliente salvo ✓");
      desenhar();
    },
    "guardar-anotacoes"(el) {
      const c = acharPorId(el.dataset.id);
      if (!c) return;
      c.anotacoes = (document.getElementById("anotacoes")?.value || "").slice(0, 1000);
      salvarCliente(c);
      aviso("Anotações guardadas ✓");
    },
    "ver-o-que-mandar": (el) => abrirRetomada(el.dataset.id),
    "tentar-retomada": () => pedirRetomada(),
    "outra-opcao-retomada"() {
      retomada.mostrarOutra = true;
      desenhar();
      app.querySelectorAll(".responda")[1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    "ja-chamei": jaChamei,
    "nova-conversa"(el) {
      novoFluxo(el.dataset.id);
      ir("foto");
      abrirSeletorFoto();
    },
    "abrir-cliente": (el) => ir("cliente", { id: el.dataset.id }),
    "marcou-visita": (el) => ir("visita", { id: el.dataset.id }),
    "visita-dia"(el) {
      ir("visita", { id: telaAtual.params.id, dia: Number(el.dataset.dia) });
    },
    "visita-hora"(el) {
      const c = acharPorId(telaAtual.params.id);
      if (!c) return;
      const [h, m] = el.dataset.hora.split(":").map(Number);
      const quando = new Date();
      quando.setDate(quando.getDate() + Number(telaAtual.params.dia || 0));
      quando.setHours(h, m, 0, 0);
      const agora = new Date();
      avancarEtapa(c, "visita_marcada", agora);
      c.visitaEm = iso(quando);
      c.aguardandoDesde = null;
      c.followupMotivo = "pos_visita";
      c.tentativas = 0;
      c.proximoFollowup = iso(new Date(quando.getTime() + 2 * 3_600_000)); // até 2h depois da visita
      c.historico.push({ tipo: "visita", em: iso(agora) });
      salvarCliente(c);
      retomada = null;
      aviso(`Visita anotada ✓ ${quandoTexto(c.visitaEm)}. Depois eu te lembro de perguntar o que ele achou.`, 5200);
      irInicio();
    },
    comprou: (el) => ir("comprou", { id: el.dataset.id }),
    "confirmar-compra"(el) {
      const c = acharPorId(el.dataset.id);
      if (!c) return;
      mudarEtapa(c, "vendido");
      c.proximoFollowup = null;
      c.aguardandoDesde = null;
      salvarCliente(c);
      retomada = null;
      festa();
      aviso(`Parabéns, ${NOME}! Venda anotada ✓ 🎉`, 5200);
      irInicio();
    },
    desistiu: (el) => ir("desistiu", { id: el.dataset.id }),
    "confirmar-desistiu"(el) {
      const c = acharPorId(el.dataset.id);
      if (!c) return;
      mudarEtapa(c, "perdido");
      c.motivoPerda = el.dataset.motivo;
      c.proximoFollowup = null;
      c.aguardandoDesde = null;
      salvarCliente(c);
      retomada = null;
      aviso("Anotado ✓ Ele saiu da sua lista.", 4200);
      irInicio();
    },
    async instalar() {
      if (!pedidoInstalar) return;
      pedidoInstalar.prompt();
      try { await pedidoInstalar.userChoice; } catch { /* ignorar */ }
      pedidoInstalar = null;
      desenhar();
    },
    "rever-passeio"() {
      passeio = 0;
      desenhar();
    },
    "passeio-ok"() {
      if (passeio < PASSEIO.length - 1) passeio++;
      else {
        passeio = null;
        guardar.gravar(CHAVES.passeio, true);
        if (telaAtual.nome !== "inicio") return irInicio();
      }
      desenhar();
    },
    entrar,
  };

  document.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;
    const acao = ACOES[alvo.dataset.acao];
    if (acao) acao(alvo, e);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "codigo-acesso") entrar();
  });

  document.getElementById("seletor-foto").addEventListener("change", async (e) => {
    const arquivos = [...(e.target.files || [])].slice(0, 4);
    if (!arquivos.length) return;
    if (!fluxo) novoFluxo();
    const lento = setTimeout(() => aviso("Preparando a foto…", 8000), 300);
    try {
      fluxo.imagens = await Promise.all(arquivos.map(prepararImagem));
    } catch {
      clearTimeout(lento);
      aviso("Não consegui abrir essa foto. Toque para escolher de novo.", 4200);
      return;
    }
    clearTimeout(lento);
    esconderAviso();
    fluxo.texto = "";
    fluxo.modoTexto = false;
    if (telaAtual.nome !== "foto") ir("foto"); // garante o passo 1 no histórico
    conversaPronta();
  });

  // ================================================================
  // 9. Começo
  // ================================================================
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedidoInstalar = e;
  });

  addEventListener("online", () => sincronizar());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      sincronizar();
      if (["inicio", "chamar"].includes(telaAtual.nome)) desenhar();
    }
  });

  async function carregarImoveis() {
    try {
      const r = await fetch("/imoveis.json", { cache: "no-cache" });
      imoveis = await r.json();
    } catch {
      imoveis = [];
    }
  }

  async function validarAcesso() {
    try {
      const d = await api("/api/config");
      suporte = d.suporte;
      if (telaAtual.nome === "ajuda") desenhar();
    } catch (e) {
      if (e.codigo === "acesso_negado") perdeuAcesso();
    }
  }

  async function iniciar() {
    // O link pessoal (/?c=CODIGO) guarda o acesso no aparelho. O código fica no endereço
    // de propósito: assim, ao instalar na tela inicial, o app continua entrando sozinho.
    const doLink = new URLSearchParams(location.search).get("c");
    if (doLink) guardar.gravar(CHAVES.codigo, doLink.trim());
    codigo = guardar.ler(CHAVES.codigo, null);

    history.replaceState({ nome: "inicio", params: {}, n: 0 }, "");
    await carregarImoveis();

    if (!codigo) {
      trocar("acesso");
      return;
    }
    trocar("inicio");
    mostrarPasseioSeForPrimeiraVez();
    validarAcesso();
    sincronizar({ buscar: true });
  }

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  iniciar();
})();
