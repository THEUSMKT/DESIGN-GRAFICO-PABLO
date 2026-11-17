# Copiloto de Vendas da Schay

App de celular (PWA) que ajuda a Schay, corretora da Imobiliária Innovar (São Leopoldo/RS), a responder clientes do WhatsApp até marcar visita e fechar venda.

- Ela tira um **print da conversa**, escolhe o imóvel e recebe a **resposta pronta** para copiar e colar no WhatsApp.
- O app **guarda o cliente sozinho** e mostra **quem chamar hoje**, com a mensagem de retomada pronta.
- O gestor de tráfego tem um **painel protegido** (`/relatorio`) com o funil completo e o relatório da semana.
- **Nada é enviado automaticamente ao WhatsApp** (sem risco de banir o número): ela sempre copia, cola e envia.

```
copiloto-schay/
├─ playbook.md               ← o "cérebro": regras de venda que a IA segue (edite à vontade)
├─ public/                   ← o app (HTML, CSS e JS puros, sem etapa de build)
│  ├─ index.html, app.js, app.css     app da Schay
│  ├─ relatorio.html/.js/.css         painel do gestor (/relatorio)
│  ├─ instalar.html                   guia ilustrado "Como instalar na tela inicial" (/instalar)
│  ├─ imoveis.json                    lista de imóveis  ← TROCAR pelos reais
│  └─ imoveis/                        fotos dos imóveis
├─ netlify/functions/        ← funções do servidor (chamam a IA e guardam os clientes)
├─ netlify/lib/              ← código compartilhado das funções
├─ scripts/                  ← gerar o cérebro, servidor local e teste das conversas
└─ netlify.toml              ← configuração do Netlify
```

---

## 1. Antes de publicar: troque os imóveis

O `public/imoveis.json` vem com **2 imóveis de EXEMPLO** (marcados "EXEMPLO - SUBSTITUIR"). A IA só usa os dados que estão nesse arquivo, então ele precisa ter os imóveis reais.

Para cada imóvel:

```jsonc
{
  "id": "apto-centro-rua-x",            // sem espaços nem acentos; não repita
  "titulo": "Apartamento 2 dormitórios no Centro",
  "bairro": "Centro",
  "tipo": "Apartamento",
  "preco": "R$ 289.000",
  "quartos": 2,
  "metragem": "58 m² privativos",
  "diferenciais": ["1 vaga coberta", "sacada com churrasqueira"],
  "condicoes": "Aceita financiamento e FGTS",
  "link": "https://link-do-anuncio",
  "foto": "imoveis/apto-centro.jpg"     // coloque a foto em public/imoveis/
}
```

Apague as linhas `"exemplo": true` e todo texto "EXEMPLO - SUBSTITUIR". Enquanto houver exemplo, o painel do gestor mostra um aviso amarelo.
**Dica:** o que não estiver no arquivo (condomínio, aceita permuta etc.), a IA não inventa: ela sugere "vou confirmar e já te retorno". Quanto mais completo o arquivo, melhores as respostas.

## 2. Pegue a chave da IA (Anthropic)

1. Crie uma conta em <https://console.anthropic.com>.
2. Em **Billing**, coloque crédito (comece com US$ 5–10) e, em **Limits**, defina um limite mensal de gasto.
3. Em **API Keys**, clique em **Create Key** e copie a chave (começa com `sk-ant-`). Guarde: ela só aparece uma vez.

## 3. Publique no Netlify (grátis)

1. Crie uma conta em <https://app.netlify.com> (pode entrar com o GitHub).
2. **Add new project → Import an existing project → GitHub** e escolha este repositório.
3. Em **Base directory**, escreva **`copiloto-schay`**. O resto (comando de build, pasta `public`, funções) vem do `netlify.toml`, não precisa mexer.
4. Antes de clicar em **Deploy**, abra **Add environment variables** (ou depois, em *Project configuration → Environment variables*) e crie:

| Variável | O que é | Exemplo |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | A chave do passo 2. Marque **Contains secret values**. | `sk-ant-...` |
| `APP_ACCESS_CODE` | Código de acesso da Schay. Use algo longo e aleatório (ela nunca digita: vai no link). | `schay-7Kq2-mP9x-41Lw` |
| `ADMIN_CODE` | Senha do painel do gestor. Diferente da anterior. | `gestor-Zt83-qL0v-Xe5n` |
| `SUPPORT_WHATSAPP` | WhatsApp do suporte (botão "Falar com o suporte"), com 55 + DDD. | `5551999999999` |
| `CLAUDE_MODEL` *(opcional)* | Modelo da IA. Padrão: `claude-sonnet-5-5`. Para gastar bem menos: `claude-haiku-5-5`. | `claude-sonnet-5-5` |
| `CLAUDE_EFFORT` *(opcional)* | Quanto a IA "pensa": `low` (padrão, mais rápido), `medium` ou `high`. | `low` |
| `LIMITE_POR_MINUTO` *(opcional)* | Máximo de respostas por minuto por aparelho. Padrão: 12. | `12` |

> Para gerar códigos aleatórios: <https://www.random.org/strings/> ou, no terminal, `openssl rand -base64 18`.

5. Clique em **Deploy**. Em 1–2 minutos o site fica no ar (ex.: `https://copiloto-schay.netlify.app`). Dá para mudar o nome em *Project configuration → Change project name*.
6. **Mudou alguma variável?** Vá em *Deploys → Trigger deploy → Deploy project* para valer.

O armazenamento dos clientes (Netlify Blobs) é ligado automaticamente, não precisa configurar nada.

## 4. Mande o acesso para a Schay

1. Abra `https://SEU-SITE.netlify.app/relatorio` e entre com o `ADMIN_CODE`.
2. Na aba **Acesso da Schay**, toque em **Enviar pelo WhatsApp**: vai o **link pessoal** dela (`/?c=CODIGO`). Ao abrir o link, o acesso fica salvo no celular, sem senha.
3. Logo depois, mande também o **guia de instalação** (botão "Enviar pelo WhatsApp" do cartão "Como instalar na tela inicial").

> Quer cortar o acesso (ex.: celular perdido)? Troque o `APP_ACCESS_CODE` no Netlify, faça um novo deploy e mande o link novo.

## 5. Instalar na tela inicial do celular

O guia ilustrado fica em `/instalar` (detecta Android ou iPhone sozinho). Resumo:

**Android (Chrome)**
1. Abra o link pessoal. Se abrir dentro do WhatsApp, toque nos 3 pontinhos ⋮ e em **Abrir no Chrome**.
2. Toque nos 3 pontinhos ⋮ no canto de cima.
3. Toque em **Adicionar à tela inicial** (ou **Instalar app**) e confirme.

**iPhone (Safari)**
1. Abra o link pessoal no **Safari**.
2. Toque no botão **Compartilhar** (quadrado com setinha para cima), embaixo.
3. Toque em **Adicionar à Tela de Início** e depois em **Adicionar**.

Importante: instale **a partir do link pessoal**. Assim o ícone já abre com o acesso dela (no iPhone, o app da tela inicial não enxerga o que foi salvo no Safari).

## 6. Como a Schay usa (para explicar a ela)

A tela inicial tem só 3 botões:

1. **📩 Responder um cliente** → a galeria já abre → escolhe o print → toca no imóvel (ou "Não sei") → aparece a resposta.
   Toque no botão verde **COPIAR E ABRIR O WHATSAPP**, segure o dedo na caixa de mensagem e toque em **Colar**.
   O cliente é salvo sozinho e o lembrete ("se ele não responder, chamar amanhã às 10h") é criado na hora.
2. **📞 Quem chamar hoje** → **Ver o que mandar** → botão verde → depois **✓ Já chamei**.
   Ali também ficam os botões **Marcou visita 🏠**, **Comprou 🎉** e **Desistiu**.
3. **❓ Preciso de ajuda** → passo a passo ilustrado e botão **Falar com o suporte**.

São 3 toques do início até a resposta pronta (Responder → foto → imóvel) e 3 toques para chamar alguém de novo (Quem chamar hoje → Ver o que mandar → Copiar).

Como o app decide sozinho:
- **Etapa** (Novo → Conversando → Visita marcada → Proposta): a IA lê a conversa e o app só avança, nunca volta. "Vendido" e "Perdido" vêm dos botões dela (ou quando o cliente pede para parar).
- **Retomada** de quem sumiu: D+1, D+3, D+7 e D+14 (a última é uma despedida educada). Depois disso o cliente sai da lista com o motivo "Parou de responder". Se ele voltar a falar, é só mandar o print de novo.
- **Pós-visita**: ao marcar a visita, o app agenda "perguntar o que ele achou" para 2h depois.

## 7. Painel do gestor (`/relatorio`)

- **Relatório** (esta semana, semana passada ou últimos 30 dias): leads recebidos, conversas iniciadas, visitas marcadas, propostas, vendas, tempo médio até a 1ª resposta, leads sem retorno; gráfico do funil; **onde está travando** (anúncio, atendimento ou fechamento); como os leads chegam (frio/morno/quente); leads por imóvel; motivos de desistência.
- **Funil**: quadro Novo → Conversando → Visita marcada → Proposta → Vendido / Perdido, com nome, telefone, imóvel, 1º contato, última interação, próximo lembrete e anotações. No topo: lembretes de hoje e leads sem retorno dela há +1h / +24h. Dá para mudar a etapa, escrever anotações e apagar um cliente.
- **Acesso da Schay**: link pessoal, guia de instalação e **exportar planilha (CSV)**.

Como os números são medidos:
- *Lead recebido*: data do 1º contato (hora da 1ª mensagem do cliente lida no print, quando é de hoje; senão, a hora em que ela abriu o app).
- *Tempo até a 1ª resposta*: do 1º contato até ela tocar em "Copiar" pela primeira vez. Só conta clientes que chegaram como primeiro contato. É uma aproximação.
- *Conversas, visitas, propostas, vendas*: quantos clientes chegaram a cada etapa dentro do período.

## 8. Custos

- **Netlify**: o plano grátis basta para uma corretora.
- **IA**: com `claude-sonnet-5-5`, cada resposta custa cerca de **US$ 0,01 a 0,02** (o playbook fica em cache, o que barateia). 300 respostas por mês ≈ US$ 3 a 6. Com `claude-haiku-5-5`, bem menos. Defina um limite mensal no console da Anthropic.
- O servidor já tenta de novo num modelo reserva se a IA recusar um pedido por política (parâmetro `fallbacks`).

## 9. Privacidade (LGPD) e segurança

- Os **prints não são guardados**: são reduzidos no próprio celular (~1500 px), passam pela função só para a IA ler e são descartados.
- Do cliente, o app guarda só: nome, telefone, imóvel, datas, etapa, 1 linha de resumo e as anotações dela. A conversa inteira não é guardada.
- Os dados ficam no celular dela e numa cópia no Netlify Blobs (para o painel do gestor e para não perder se ela trocar de celular).
- Pedido de exclusão: no painel, aba **Funil → Editar → Apagar**. Some do servidor e do celular dela na próxima sincronização.
- A chave da IA fica só na variável `ANTHROPIC_API_KEY` do Netlify, nunca no app. Sem o código de acesso, as funções recusam o pedido; há limite de pedidos por minuto.

## 10. Ajustar o "cérebro"

As regras de venda estão em **`playbook.md`** (princípios, objeções, retomada, honestidade, formato da resposta). Edite o texto, faça commit e o Netlify publica sozinho. No build, `scripts/gerar-cerebro.mjs` transforma o playbook no prompt da função e confere se o `imoveis.json` está válido (um JSON quebrado faz o deploy falhar em vez de derrubar o app).

## 11. Testar no computador (opcional)

Precisa de Node 22.18 ou mais novo.

```bash
cd copiloto-schay
npm install

# App + painel + funções + Blobs locais, sem instalar o Netlify CLI:
ANTHROPIC_API_KEY=sk-ant-... npm run local
#   → http://localhost:8888/?c=schay-teste   (painel: /relatorio, código gestor-teste)
#   sem chave, use IA_FALSA=1 npm run local para ver as telas com uma resposta de exemplo

# As 3 conversas fictícias (prints em scripts/conversas-teste/):
ANTHROPIC_API_KEY=sk-ant-... npm run testar
#   → mostra o resultado e grava scripts/conversas-teste/resultado.md
```

Também funciona com o Netlify CLI (`npm run dev`).

## Limitações conhecidas

- Os lembretes aparecem quando ela abre o app (a bolinha vermelha mostra quantos). Não há notificação no celular.
- A leitura do print depende da qualidade da imagem: prints muito cortados podem perder o nome/telefone; nesse caso o app pede só o nome.
- O app abre o WhatsApp na conversa do cliente quando o telefone aparece no print; se não aparecer, abre o WhatsApp para ela escolher o contato.
- O armazenamento em Netlify Blobs atende bem algumas centenas de clientes. Para uma equipe inteira, o próximo passo seria um banco de dados.
