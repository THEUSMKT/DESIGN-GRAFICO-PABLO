// Transforma o playbook.md em um módulo JavaScript que a função da IA importa.
// Roda automaticamente no build do Netlify (netlify.toml → [build] command).
// Assim o playbook.md continua fácil de editar e vai junto no pacote da função.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playbook = await readFile(path.join(raiz, "playbook.md"), "utf8");

// Confere o imoveis.json antes de publicar: um JSON quebrado derrubaria o app.
const imoveis = JSON.parse(await readFile(path.join(raiz, "public", "imoveis.json"), "utf8"));
if (!Array.isArray(imoveis)) throw new Error("imoveis.json precisa ser uma lista [ ... ]");
const ids = new Set();
for (const imovel of imoveis) {
  if (!imovel.id || !imovel.titulo) throw new Error(`Imóvel sem "id" ou "titulo": ${JSON.stringify(imovel).slice(0, 80)}`);
  if (ids.has(imovel.id)) throw new Error(`Dois imóveis com o mesmo id: ${imovel.id}`);
  ids.add(imovel.id);
}

const destino = path.join(raiz, "netlify", "lib", "playbook.gerado.mjs");
await mkdir(path.dirname(destino), { recursive: true });
await writeFile(
  destino,
  `// ARQUIVO GERADO por scripts/gerar-cerebro.mjs a partir de playbook.md. Não edite aqui.\nexport const PLAYBOOK = ${JSON.stringify(playbook.trim())};\n`,
);

const exemplos = imoveis.filter((i) => i.exemplo).length;
console.log(`Cérebro gerado: playbook com ${playbook.length} caracteres, ${imoveis.length} imóveis${exemplos ? ` (${exemplos} ainda são EXEMPLO - SUBSTITUIR)` : ""}.`);
