import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'municipios_por_comando_regional_colored.geojson');
const outputPath = path.join(__dirname, 'municipios_por_comando_regional_colorido.geojson');

const fileContent = await fs.readFile(inputPath, 'utf-8');
const geojson = JSON.parse(fileContent);

geojson.features.forEach(feature => {
    const props = feature.properties;
    const comando = props['comandoRegional'];

    if (!comando || !props.description || typeof props.description !== 'object') return;

    const html = props.description.value;

    const dom = new JSDOM(html);
    const document = dom.window.document;
    const tabelas = document.querySelectorAll('table');
    if (tabelas.length > 1) {
        const tabelaDados = tabelas[1];
        const tbody = tabelaDados.querySelector('tbody') || tabelaDados;
        const novaLinha = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = 'comandoRegional';
        const td2 = document.createElement('td');
        td2.textContent = comando;
        novaLinha.appendChild(td1);
        novaLinha.appendChild(td2);
        if (tbody.firstChild) {
            tbody.insertBefore(novaLinha, tbody.firstChild);
        } else {
            tbody.appendChild(novaLinha);
        }
        props.description.value = dom.serialize();
        // NÃO remove mais o campo do nível principal!
    }
});

await fs.writeFile(outputPath, JSON.stringify(geojson, null, 2), 'utf-8');
console.log(`✅ Arquivo salvo em: ${outputPath}`);