import fs from "fs";

// Carrega arquivo GeoJSON já existente
const geojson = JSON.parse(fs.readFileSync("./municipios_por_comando_regional.geojson", "utf8"));

// Mapa de cores por comando regional
const coresPorCR = {
    "CR BM I": { fill: "#fe5501", stroke: "#C54200", "fill-opacity": "0.35" },
    "CR BM II": { fill: "#fcd6c5", stroke: "#C2A597", "fill-opacity": "0.35" },
    "CR BM III": { fill: "#f7c566", stroke: "#DAAD59", "fill-opacity": "0.35" },
    "CR BM IV": { fill: "#E7FF9C", stroke: "#CCE28A", "fill-opacity": "0.35" },
    "CR BM V": { fill: "#DBB6F5", stroke: "#C0A0D8", "fill-opacity": "0.35" },
    "CR BM VI": { fill: "#D6F2B2", stroke: "#A3B888", "fill-opacity": "0.35" },
    "CR BM VII": { fill: "#96dbf3", stroke: "#72A6B8", "fill-opacity": "0.35" }
};

// Atualiza cada feature
geojson.features.forEach((feature) => {
    const cr = feature.properties.comandoRegional;
    const cor = coresPorCR[cr];
    if (cor) {
        feature.properties.fill = cor.fill;
        feature.properties.stroke = cor.stroke;
        feature.properties["fill-opacity"] = Number(cor["fill-opacity"]); // <-- CORRIGIDO AQUI!
    }
});

// Salva novamente
fs.writeFileSync(
    "./municipios_por_comando_regional_colored.geojson",
    JSON.stringify(geojson, null, 2),
    "utf8"
);

console.log("Arquivo municipios_por_comando_regional_colored.geojson gerado com cores por CR!");
