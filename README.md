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

## 1. Antes de publicar: coloque as duas fotos

As fotos **não estão no repositório**. Salve-as exatamente com estes nomes:

| Arquivo | Onde aparece |
| --- | --- |
| `assets/foto-apresentacao.jpg` | Hero (topo) e prévia de compartilhamento (Open Graph) |
| `assets/foto-historia.jpg` | Seção "Minha história" |

Enquanto uma foto não existir, o site mostra uma moldura com o monograma "PC" no lugar dela.

Depois de colocar as fotos, gere as versões WebP (mais leves):

```bash
pip install Pillow
python3 tools/otimizar-imagens.py
```

O script cria os `.webp`, reduz fotos grandes (o original fica em `_originais/`) e avisa se faltar alguma foto.
Se não quiser rodar o script, o site continua funcionando só com os `.jpg`. Nesse caso, prefira fotos com até 1400 px de largura e menos de 400 KB (você pode reduzir em https://squoosh.app).

O enquadramento das fotos pode ser ajustado em `css/style.css` pela variável `--focus`
(ex.: `--focus: 50% 22%`, que significa centro na horizontal e 22% a partir do topo).

## 2. Conteúdo a preencher

Procure por `[PREENCHER]` no `index.html`. Os trechos aparecem destacados em dourado no site até serem substituídos:

- **Minha história:** como você começou, segmentos/cidades atendidos, um marco da carreira.
- **Números:** projetos entregues e empresas atendidas. O comentário no HTML mostra como ativar o contador animado.
- **FAQ:** prazos, número de rodadas de ajuste, formatos dos arquivos e valores.
- **Depoimentos:** substitua `[DEPOIMENTO]`, `[NOME]` e `[EMPRESA]` por depoimentos reais, com autorização dos clientes.

## 3. Portfólio

As 12 imagens em `assets/portfolio/` são placeholders. Para trocar um projeto:

1. Substitua `projeto-XX.jpg` pela imagem do trabalho.
2. Rode `python3 tools/otimizar-imagens.py`. Se não rodar, **apague o `projeto-XX.webp` antigo**; senão o navegador continua mostrando o placeholder.
3. No `index.html`, ajuste a categoria (`data-cat`), o nome do projeto e o texto alternativo (`alt`).

Categorias disponíveis: `identidade`, `social`, `anuncios`, `embalagens`, `impressos`, `apresentacoes`.

## 4. Publicar no Netlify

1. Acesse https://app.netlify.com/drop.
2. Arraste esta pasta inteira.
3. Depois de publicado, troque no `<head>` do `index.html` os caminhos de `og:image` e `twitter:image`
   pelo endereço completo (ex.: `https://seusite.netlify.app/assets/foto-apresentacao.jpg`) e publique de novo.
   Assim a foto aparece quando o link for compartilhado no WhatsApp e nas redes.

## Contatos usados no site

- WhatsApp: (51) 99195-7156 (mensagem pronta; nos cards de serviço a mensagem já cita o serviço)
- Instagram: [@cavalheiro_pablo](https://www.instagram.com/cavalheiro_pablo/)
