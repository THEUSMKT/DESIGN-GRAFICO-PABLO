# Pablo Cavalheiro · Design Gráfico

Landing page do Pablo Cavalheiro, designer gráfico. HTML, CSS e JavaScript puros, sem dependências e sem etapa de build.

```
index.html            página
css/style.css         estilos
js/main.js            interações e animações
assets/               fotos, favicon, textura e portfólio
assets/portfolio/     imagens do portfólio (projeto-01 … projeto-12)
tools/                script para otimizar as imagens
404.html, _headers, robots.txt   arquivos para o Netlify
```

## 1. Fotos

As fotos já estão no site, recortadas no formato 4:5 e com versão WebP:

| Arquivo | Onde aparece |
| --- | --- |
| `assets/foto-apresentacao.jpg` / `.webp` | Hero (topo) e prévia de compartilhamento (Open Graph) |
| `assets/foto-historia.jpg` / `.webp` | Seção "Minha história" |

Para trocar uma foto, substitua o `.jpg` e gere o WebP de novo:

```bash
pip install Pillow
python3 tools/otimizar-imagens.py
```

Se não quiser rodar o script, apague o `.webp` correspondente: o site usa o `.jpg` automaticamente.
Se uma foto faltar, o site mostra uma moldura com o monograma "PC" no lugar.

O enquadramento das fotos pode ser ajustado em `css/style.css` pela variável `--focus`
(ex.: `--focus: 50% 22%`, que significa centro na horizontal e 22% a partir do topo).

## 2. Conteúdo a preencher

História e números já estão preenchidos (25 anos de carreira, +1.500 projetos, +50 empresas).
Procure por `[PREENCHER]` no `index.html` para o que ainda falta. Os trechos aparecem destacados em dourado no site até serem substituídos:

- **FAQ:** prazos, número de rodadas de ajuste, formatos dos arquivos e valores.
- **Depoimentos:** substitua `[DEPOIMENTO]`, `[NOME]` e `[EMPRESA]` por depoimentos reais, com autorização dos clientes.

## 3. Portfólio

As 12 imagens em `assets/portfolio/` são placeholders. Para trocar um projeto:

1. Substitua `projeto-XX.jpg` pela imagem do trabalho.
2. Rode `python3 tools/otimizar-imagens.py`. Se não rodar, **apague o `projeto-XX.webp` antigo**; senão o navegador continua mostrando o placeholder.
3. No `index.html`, ajuste a categoria (`data-cat`), o nome do projeto e o texto alternativo (`alt`).

Categorias disponíveis: `identidade`, `social`, `anuncios`, `embalagens`, `impressos`, `apresentacoes`.

## 4. Publicação

**GitHub Pages (ativo):** https://theusmkt.github.io/DESIGN-GRAFICO-PABLO/

Todo push na branch `main` publica o site automaticamente (workflow `.github/workflows/pages.yml`).
Acompanhe em *Actions* no GitHub. A atualização leva cerca de 1 minuto.

**Netlify (alternativa):** arraste a pasta em https://app.netlify.com/drop.
Se publicar em outro endereço ou domínio próprio, atualize `canonical`, `og:url`, `og:image` e `twitter:image`
no `<head>` do `index.html`.

## Contatos usados no site

- WhatsApp: (51) 99195-7156 (mensagem pronta; nos cards de serviço a mensagem já cita o serviço)
- Instagram: [@cavalheiro_pablo](https://www.instagram.com/cavalheiro_pablo/)
