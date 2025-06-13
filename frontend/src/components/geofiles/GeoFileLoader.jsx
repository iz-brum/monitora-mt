// 📦 Importações fundamentais para o funcionamento do componente

// 🔄 React Hooks essenciais
// - useEffect: gerencia efeitos colaterais (ciclo de vida do componente)
// - useState: gerencia estados reativos (ex: features carregadas)
import { useEffect, useState } from 'react'

// 🗺️ Hook do React-Leaflet que retorna a instância atual do mapa Leaflet
// Permite manipular diretamente métodos e propriedades do mapa
import { useMap } from 'react-leaflet'

// 🧭 Biblioteca Leaflet principal (não apenas React wrapper)
// Necessária para acessar APIs como L.Control, L.Layer, L.DomUtil, etc.
import L from 'leaflet'

// 📦 Biblioteca JSZip: usada para descompactar arquivos KMZ (zip contendo KML)
// Permite leitura direta de buffer binário e extração do XML
import JSZip from 'jszip'

// 🔁 Biblioteca toGeoJSON: converte arquivos KML para o formato GeoJSON
// Essencial para interoperabilidade com Leaflet (que usa GeoJSON nativamente)
import * as toGeoJSON from 'togeojson'

// 🔍 Componente visual para mostrar dados importados como popup flutuante
import ImportedFeatureViewer from '@components/layout/ImportedFeatureViewer'
void ImportedFeatureViewer

// 🧠 Utilitário para extrair imagem de descrição textual (usado nos ícones de ponto)
import { extrairURLImagemDeDescricao } from '@utils/featureImagem'

/**
 * 📁 GeoFileLoader
 *
 * Componente React responsável por:
 * - Inicializar o controle de upload no mapa Leaflet (botão + input hidden)
 * - Interpretar arquivos GeoJSON, KML e KMZ
 * - Exibir painel flutuante com os dados importados
 *
 * Funciona como "ponte" entre o DOM (input de arquivo) e o mapa do Leaflet.
 *
 * @component
 * @returns {JSX.Element|null}
 */
export default function GeoFileLoader() {
    const map = useMap(); // Instância do mapa Leaflet

    // Features (várias) + aba ativa
    const [features, setFeatures] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [posicaoTabela, setPosicaoTabela] = useState(null);

    useEffect(() => {
        if (!podeIniciarComponente(map)) return;
        inicializarGeoFileControl(
            map,
            (newFeatures, pos) => {
                // Suporte a múltiplos uploads: adiciona no array (mas evita duplicatas)
                setFeatures(prev => {
                    const novas = Array.isArray(newFeatures) ? newFeatures : [newFeatures];
                    const atualizadas = [...prev];
                    novas.forEach(f => {
                        const existe = atualizadas.some(
                            feat => JSON.stringify(feat) === JSON.stringify(f)
                        );
                        if (!existe) atualizadas.push(f);
                    });
                    // Aba ativa é sempre a última recém adicionada
                    setActiveIndex(atualizadas.length - 1);
                    return atualizadas;
                });
                setPosicaoTabela(pos);
            },
            setPosicaoTabela // (caso queira controlar só a posição)
        );
        return () => limparGeoFileControl(map);
    }, [map]);

    // Seleção de abas
    function handleSelectTab(i) {
        setActiveIndex(i);
    }

    // Fechamento de aba
    function handleCloseTab(i) {
        if (i === -1) {
            setFeatures([]);
            setActiveIndex(0);
        } else {
            const novas = features.slice();
            novas.splice(i, 1);
            setFeatures(novas);
            if (activeIndex >= novas.length) {
                setActiveIndex(Math.max(0, novas.length - 1));
            } else if (i < activeIndex) {
                setActiveIndex(activeIndex - 1);
            }
        }
    }

    return (
        <>
            {features.length > 0 && (
                <ImportedFeatureViewer
                    features={features}
                    activeIndex={activeIndex}
                    onSelectTab={handleSelectTab}
                    onCloseTab={handleCloseTab}
                    onClose={() => setFeatures([])}
                    leafletMap={map}
                    posicaoInicial={posicaoTabela}
                />
            )}
        </>
    );
}

// ===========================================================
// == 🔧 FUNÇÕES AUXILIARES: Inicialização e Teardown
// ===========================================================

/**
 * 🔍 Verifica se o controle já foi adicionado ao mapa
 *
 * Evita múltiplas inicializações em renders subsequentes.
 *
 * @param {L.Map} map - Instância do mapa
 * @returns {boolean}
 */
function podeIniciarComponente(map) {
    return !!map && !map._geoFileControlAdded
}

/**
 * 🚀 Adiciona ao mapa:
 * - Input invisível de upload
 * - Botão de upload no canto do mapa
 * - Listener que envia o arquivo para parsing
 *
 * @param {L.Map} map - Mapa Leaflet
 * @param {Function} setFeatureImportada - Setter para estado com feature
 * @param {Function} setPosicaoTabela - Setter para posição do popup
 */
function inicializarGeoFileControl(map, setFeatureImportada, setPosicaoTabela) {
    map._geoFileControlAdded = true

    const input = criarInputUpload()                     // Cria input <input type="file">
    document.body.appendChild(input)                     // Adiciona ao body (não ao mapa)

    const geoFileControl = criarBotaoUpload(input)       // Cria botão Leaflet
    map.addControl(geoFileControl)                       // Adiciona botão ao mapa

    // 📡 Conecta o input ao handler de arquivo
    input.addEventListener('change', e =>
        handleArquivoSelecionado(e, map, setFeatureImportada, setPosicaoTabela)
    )

    // 🔒 Armazena referências no objeto do mapa (para posterior remoção)
    map._geoInputRef = input
    map._geoFileControlRef = geoFileControl
}

// 🧹 limparGeoFileControl:
// Remove completamente o botão e o input do DOM e do mapa.
// Restaura o estado para permitir reinicialização segura.
function limparGeoFileControl(map) {
    if (map._geoFileLayersControl) {
        map.removeControl(map._geoFileLayersControl)
        delete map._geoFileLayersControl
    }

    document.body.removeChild(map._geoInputRef)     // ❌ Remove input do body.
    map.removeControl(map._geoFileControlRef)       // ❌ Remove botão do mapa.
    map._geoFileControlAdded = false                // 🔄 Permite nova inicialização.
}

//
// == Upload de Arquivo (Input e Botão) ==
// Este módulo adiciona ao mapa um botão "📁" no canto superior esquerdo,
// que aciona um input invisível para importar arquivos georreferenciados.
//

// 📂 criarInputUpload:
// Cria um input <input type="file"> oculto, aceitando os formatos suportados.
// O clique é disparado manualmente via botão externo.
function criarInputUpload() {
    const input = L.DomUtil.create('input', 'leaflet-control-geofile-input')
    input.type = 'file'
    input.accept = '.geojson,.json,.kml,.kmz' // ✅ Tipos permitidos
    input.style.display = 'none'              // 👻 Invisível na interface
    return input
}

// 🖲️ criarBotaoUpload:
// Cria um botão Leaflet customizado no mapa que aciona o input de upload.
// Estilizado e posicionado como um controle padrão do Leaflet.
function criarBotaoUpload(input) {
    const CustomGeoFileControl = L.Control.extend({
        onAdd: () => {
            const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom')
            btn.innerHTML = '📁'                               // 📎 Ícone de importação
            btn.title = 'Importar arquivo georreferenciado'   // 🧠 Acessibilidade
            btn.onclick = () => input.click()                 // 🖱️ Aciona o input invisível

            // 🛡️ Protege o botão contra propagação de eventos do mapa
            L.DomEvent.disableClickPropagation(btn)
            L.DomEvent.disableScrollPropagation(btn)

            return btn
        }
    })

    return new CustomGeoFileControl({ position: 'topleft' }) // 📍 Localização estratégica
}

//
// == Manipulação de Arquivos (Dispatcher + Handlers) ==
// Detecta, valida e despacha arquivos geográficos para o parser correto.
// Suporta GeoJSON, JSON, KML, KMZ. Protege contra formatos não reconhecidos.
//

// 🚦 handleArquivoSelecionado:
// Função principal chamada ao selecionar um arquivo.
// Valida, extrai e despacha para o handler correto.
function handleArquivoSelecionado(e, map, setFeatureImportada, setPosicaoTabela) {
    const file = extrairArquivo(e) // 📦 Obtém o arquivo do evento.
    if (!file) return

    const handler = obterHandler(file) // 🎯 Escolhe a função correta.
    handler(file, map, setFeatureImportada, setPosicaoTabela) // 🛠️ Executa o parsing.
}

// 🧬 extrairArquivo:
// Valida a estrutura do evento e retorna o primeiro arquivo.
function extrairArquivo(e) {
    if (!temTargetComArquivo(e)) return null
    return e.target.files[0]
}

// ✅ temTargetComArquivo:
// Verifica se o evento contém arquivos válidos.
function temTargetComArquivo(e) {
    return validarEstruturaBasica(e) && validarArquivos(e)
}

// 🔍 validarEstruturaBasica:
// Confere se o evento e o target estão presentes.
function validarEstruturaBasica(e) {
    return ehEventoValido(e) && temTarget(e)
}

// 📁 validarArquivos:
// Confirma se há arquivos e se não estão vazios.
function validarArquivos(e) {
    return temFiles(e) && arquivosNaoVazios(e)
}

// 🧱 ehEventoValido:
function ehEventoValido(e) {
    return !!e
}

// 🧷 temTarget:
function temTarget(e) {
    return !!e.target
}

// 🧾 temFiles:
function temFiles(e) {
    return !!e.target.files
}

// 🔒 arquivosNaoVazios:
function arquivosNaoVazios(e) {
    return e.target.files.length > 0
}

// == 📦 Dispatcher ==

// 🗂️ mapaDeHandlers:
// Mapeia extensões para suas respectivas funções de leitura.
const mapaDeHandlers = {
    geojson: lerGeoJSONFile,
    json: lerGeoJSONFile,
    kml: lerKMLFile,
    kmz: lerKMZFile
}

// 🧭 obterHandler:
// Retorna o handler com base na extensão ou um fallback.
function obterHandler(file) {
    const ext = obterExtensao(file) // 🧪 Ex: "kml"
    return mapaDeHandlers[ext] ?? lidarFormatoNaoSuportado // 🛡️ Fallback seguro.
}

// 🔍 obterExtensao:
// Extrai a extensão do nome do arquivo, em minúsculas.
function obterExtensao(file) {
    return file.name.split('.').pop().toLowerCase()
}

// 🚫 lidarFormatoNaoSuportado:
// Alerta o operador de que o tipo não é aceito.
function lidarFormatoNaoSuportado() {
    alert('Formato de arquivo não suportado')
}

//
// == Parsing de Arquivos GeoJSON, KML, KMZ ==
// Este módulo interpreta e converte arquivos geográficos em dados GeoJSON
// prontos para renderização no Leaflet. Cobre três formatos: GeoJSON, KML e KMZ.
//

// ======= 📁 GeoJSON =======

// 📥 lerGeoJSONFile:
// Lê o arquivo GeoJSON como texto e inicia o parsing.
function lerGeoJSONFile(file, map, setFeatureImportada, setPosicaoTabela) {
    const reader = new FileReader()
    reader.onload = () =>
        tentarParsearGeoJSON(reader.result, file.name, map, setFeatureImportada, setPosicaoTabela)
    reader.readAsText(file)
}

// 🧠 tentarParsearGeoJSON:
// Tenta converter o texto em objeto, limita o número de features e renderiza.
function tentarParsearGeoJSON(texto, nome, map, setFeatureImportada, setPosicaoTabela) {
    try {
        const json = JSON.parse(texto)
        const limitado = limitarFeatures(json) // 🔐 Proteção contra overload.
        renderizarGeoJSON(limitado, map, nome, setFeatureImportada, setPosicaoTabela)
    } catch (err) {
        lidarComErroDeArquivo(err)
    }
}

// ======= 🧭 KML =======

// 📥 lerKMLFile:
// Lê o conteúdo de um arquivo KML como texto.
function lerKMLFile(file, map, setFeatureImportada, setPosicaoTabela) {
    const reader = new FileReader()
    reader.onload = () =>
        tentarParsearKML(reader.result, file.name, map, setFeatureImportada, setPosicaoTabela)
    reader.readAsText(file)
}

// 🧠 tentarParsearKML:
// Converte o XML para GeoJSON e injeta ícones baseados nos estilos encontrados.
function tentarParsearKML(xmlTexto, nome, map, setFeatureImportada, setPosicaoTabela) {
    try {
        const geojson = converterKMLParaGeoJSONComEstilos(xmlTexto)
        const limitado = limitarFeatures(geojson)
        renderizarGeoJSON(limitado, map, nome, setFeatureImportada, setPosicaoTabela)
    } catch (err) {
        lidarComErroDeArquivo(err)
    }
}

// 🔄 converterKMLParaGeoJSONComEstilos:
// Transforma o texto XML em DOM, extrai estilos e converte para GeoJSON com ícones injetados.
function converterKMLParaGeoJSONComEstilos(xmlTexto) {
    const xml = parsearXML(xmlTexto)
    const estiloMapeado = mapearEstilosDoKML(xml) // 🖌️ Mapeia estilos <Style>
    const geojson = toGeoJSON.kml(xml)            // 📦 Conversão com toGeoJSON

    geojson.features.forEach(f => injetarIconeNaFeature(f, estiloMapeado))
    return geojson
}

// 🧱 parsearXML:
// Converte string XML para DOM.
function parsearXML(texto) {
    return new DOMParser().parseFromString(texto, 'text/xml')
}

// ======= 🗜️ KMZ =======

// 📥 lerKMZFile:
// Lê um arquivo KMZ como ArrayBuffer para descompactação posterior.
function lerKMZFile(file, map, setFeatureImportada, setPosicaoTabela) {
    const reader = new FileReader()
    reader.onload = () =>
        tentarProcessarKMZ(reader.result, file.name, map, setFeatureImportada, setPosicaoTabela)
    reader.readAsArrayBuffer(file)
}

// 🧠 tentarProcessarKMZ:
// Descompacta o arquivo KMZ, extrai o .kml e converte para GeoJSON.
async function tentarProcessarKMZ(buffer, nome, map, setFeatureImportada, setPosicaoTabela) {
    try {
        const zip = await carregarZip(buffer)
        const kmlText = await extrairTextoKML(zip)
        const geojson = converterKMLparaGeoJSON(kmlText)
        const limitado = limitarFeatures(geojson)
        renderizarGeoJSON(limitado, map, nome, setFeatureImportada, setPosicaoTabela)
    } catch (err) {
        lidarComErroDeArquivo(err)
    }
}

// 🗜️ carregarZip:
// Usa JSZip para carregar e descompactar o buffer.
async function carregarZip(buffer) {
    return JSZip.loadAsync(buffer)
}

// 🔎 extrairTextoKML:
// Localiza o primeiro arquivo .kml dentro do ZIP e extrai como texto.
async function extrairTextoKML(zip) {
    const kmlFile = encontrarArquivoKML(zip)
    if (!kmlFile) throw new Error('KMZ inválido')
    return zip.files[kmlFile].async('text')
}

// 🧭 encontrarArquivoKML:
// Busca o primeiro arquivo com extensão .kml dentro do ZIP.
function encontrarArquivoKML(zip) {
    return Object.keys(zip.files).find(f => f.endsWith('.kml'))
}

// 🔄 converterKMLparaGeoJSON:
// Conversão direta de texto XML para GeoJSON sem injetar estilos.
function converterKMLparaGeoJSON(kmlText) {
    const xml = new DOMParser().parseFromString(kmlText, 'text/xml')
    return toGeoJSON.kml(xml)
}

//
// == Estilos e Ícones Personalizados ==
// Este módulo interpreta estilos definidos em arquivos KML,
// associa ícones personalizados a features e injeta-os nas propriedades para renderização.
//

// 🗺️ mapearEstilosDoKML:
// Extrai todos os <Style> do XML e monta um mapa { id: href } com ícones encontrados.
function mapearEstilosDoKML(xmlDoc) {
    const mapa = {}
    const estilos = xmlDoc.querySelectorAll('Style')

    estilos.forEach(style => registrarEstilo(style, mapa)) // 🔁 Processa todos os estilos.
    return mapa // 🎯 Retorna mapa de estilos indexado por ID.
}

// 🏷️ registrarEstilo:
// Lê o ID e o href de um <Style> e, se forem válidos, adiciona ao mapa.
function registrarEstilo(style, mapa) {
    const id = extrairIdDoEstilo(style)     // 🆔 Ex: style id="placa1"
    const href = extrairHrefDoEstilo(style) // 🔗 Ex: Icon > href > "icone.png"

    if (estiloValido(id, href)) {
        atribuirEstiloAoMapa(id, href, mapa) // ✅ Armazena no mapa.
    }
}

// 🔍 extrairIdDoEstilo:
// Extrai o atributo "id" do nó <Style>.
function extrairIdDoEstilo(style) {
    return style.getAttribute('id')
}

// 🔗 extrairHrefDoEstilo:
// Acessa o texto de <Icon><href> dentro de um <Style>.
function extrairHrefDoEstilo(style) {
    return style.querySelector('Icon > href')?.textContent
}

// ✅ estiloValido:
// Verifica se tanto o id quanto o href são não-nulos e não vazios.
function estiloValido(id, href) {
    return Boolean(id) && Boolean(href)
}

// 🧭 atribuirEstiloAoMapa:
// Associa um ID de estilo ao seu ícone correspondente no mapa.
function atribuirEstiloAoMapa(id, href, mapa) {
    mapa[id] = href
}

// 🖼️ injetarIconeNaFeature:
// Se a feature tiver styleUrl e ele existir no mapa de estilos,
// injeta o URL como _iconePersonalizado nas propriedades.
function injetarIconeNaFeature(feature, estilos) {
    const styleId = obterStyleId(feature)
    const urlIcone = estilos[styleId]

    if (urlIcone) {
        feature.properties._iconePersonalizado = urlIcone // 🎯 Tag usada na renderização.
    }
}

// 📦 obterStyleId:
// Extrai o styleId da feature, limpando o caractere '#' do início.
function obterStyleId(feature) {
    const props = acessarProperties(feature)
    return extrairStyleUrl(props)
}

// 🔐 acessarProperties:
// Acessa o objeto de propriedades da feature com segurança.
function acessarProperties(f) {
    return temProps(f) ? f.properties : {}
}

// ✅ temProps:
// Verifica se o objeto possui um campo .properties válido.
function temProps(f) {
    return Boolean(f) && Boolean(f.properties)
}

// 🧼 extrairStyleUrl:
// Remove o prefixo "#" do styleUrl (padrão KML) para usar como chave no mapa.
function extrairStyleUrl(props) {
    const raw = props.styleUrl
    return raw ? raw.replace(/^#/, '') : ''
}

//
// == Limitação e Renderização ==
// Este módulo gerencia o volume de dados exibido e executa a renderização controlada
// de camadas GeoJSON, garantindo performance e navegação segura.
//

// 🚦 limitarFeatures:
// Impõe um limite de features por arquivo para evitar travamentos no navegador.
// Se excedido, alerta o usuário e recorta os dados.
function limitarFeatures(geojson) {
    const LIMITE = 200

    if (geojson.features.length > LIMITE) {
        alert(`⚠️ Arquivo muito grande (${geojson.features.length} features).\nApenas as ${LIMITE} primeiras serão carregadas.`)
        geojson.features = geojson.features.slice(0, LIMITE) // ✂️ Recorte seguro.
    }

    return geojson // 🔁 Retorna versão segura do GeoJSON.
}

// 🧭 renderizarGeoJSON:
// Pipeline completo de renderização de GeoJSON no mapa.
// Cria camada, adiciona ao mapa, registra no controle e ajusta a visão.
function renderizarGeoJSON(geojson, map, nomeArquivo, setFeatureImportada, setPosicaoTabela) {
    const layer = configGeoJSONLayer(geojson, map, setFeatureImportada, setPosicaoTabela) // 🔧 Cria camada com eventos.
    adicionarLayerNoMapa(layer, map, nomeArquivo)                                         // ➕ Adiciona no mapa e no controle.
    ajustarZoomSeguro(map, layer)                                                         // 🔍 Ajusta a visão.
}

// 🔍 ajustarZoomSeguro:
// Tenta ajustar o zoom para exibir toda a camada.
// Protege contra falhas de geometria inválida ou vazia.
function ajustarZoomSeguro(map, layer) {
    try {
        map.fitBounds(layer.getBounds()) // 🧭 Enquadra a camada no mapa.
    } catch (err) {
        console.warn('fitBounds falhou:', err) // 🛑 Diagnóstico leve para falhas não críticas.
    }
}

//
// == Criação de Layers no Mapa ==
// Este módulo transforma um objeto GeoJSON em uma camada Leaflet interativa.
// Possui tratamento especial para pontos: usa ícones personalizados quando disponíveis.
//

// 🧭 configGeoJSONLayer:
// Cria uma camada Leaflet a partir de GeoJSON, com eventos de clique
// e suporte a pontos com ícone ou marcador padrão.
function configGeoJSONLayer(geojson, map, setFeatureImportada, setPosicaoTabela) {
    return L.geoJSON(geojson, {
        onEachFeature: (feature, layer) => {
            layer.on('click', e => {
                const pixel = map.latLngToContainerPoint(e.latlng)
                setFeatureImportada([feature])
                setPosicaoTabela({ x: pixel.x + 20, y: pixel.y })

                if (e.originalEvent) {
                    e.originalEvent.__featureClick = true
                }
            })
        },

        // 🎨 Estilo baseado nas propriedades do arquivo de origem
        style: feature => {
            const props = feature.properties || {}

            return {
                color: props.stroke || '#000000',
                weight: Number(props['stroke-width']) || 1,
                opacity: props['stroke-opacity'] != null ? Number(props['stroke-opacity']) : 1,
                fillColor: props.fill || '#3388ff',
                fillOpacity: props['fill-opacity'] != null ? Number(props['fill-opacity']) : 0.1
            }
        },

        // 🧬 Ícones para pontos continuam funcionando
        pointToLayer: (feature, latlng) =>
            criarCamadaParaPonto(feature, latlng, map.getZoom())
    })
}


// 🎯 criarCamadaParaPonto:
// Decide qual tipo de camada criar para um ponto — ícone personalizado ou marcador padrão.
function criarCamadaParaPonto(feature, latlng, zoom) {
    const icon = tentarCriarIcone(feature, zoom)
    return icon
        ? L.marker(latlng, { icon })     // 🖼️ Com ícone
        : criarMarcadorPadrao(latlng)   // 🔵 Fallback padrão
}

// 🔍 tentarCriarIcone:
// Tenta extrair um ícone da descrição da feature.
// Se houver URL de imagem, gera um ícone compatível.
function tentarCriarIcone(feature, zoom) {
    const url = extrairURLImagemDeDescricao(feature)
    return url ? gerarIconeImagem(url, zoom) : null
}

// 🔵 criarMarcadorPadrao:
// Fallback para exibir ponto como circleMarker com estilo pré-definido.
function criarMarcadorPadrao(latlng) {
    return L.circleMarker(latlng, {
        radius: 4,
        fillColor: '#ff6600',
        color: '#fff',
        weight: 0.5,
        opacity: 1,
        fillOpacity: 0.7,
        renderer: L.canvas() // 💨 Melhor performance com muitos pontos.
    })
}

// 🖼️ gerarIconeImagem:
// Cria um ícone do Leaflet a partir de uma URL, com escala ajustada ao zoom atual.
function gerarIconeImagem(url, zoom) {
    const baseSize = 34
    const escala = Math.max(1, Math.min(zoom / 10, 2)) // 🔄 Escala entre 1x e 2x.
    const tamanho = baseSize * escala

    return L.icon({
        iconUrl: url,
        iconSize: [tamanho, tamanho],
        iconAnchor: [tamanho / 2, tamanho],
        popupAnchor: [0, -tamanho],
        className: 'icone-customizado-da-feature'
    })
}

//
// == Registro no Layer Control ==
// Este módulo integra novas camadas geográficas ao painel de controle do Leaflet.
// Cada camada importada é identificada, nomeada e organizada visualmente.
//

// 🧭 adicionarLayerNoMapa:
// Adiciona a camada ao mapa e tenta registrá-la no controle de camadas.
function adicionarLayerNoMapa(layer, map, nomeArquivo) {
    layer.addTo(map) // 🗺️ Exibe imediatamente no mapa.
    tentarRegistrarNoLayerControl(map, nomeArquivo, layer) // 📋 Tenta listar no controle lateral.
}

// 🔍 tentarRegistrarNoLayerControl:
// Verifica se o controle de camadas está presente antes de tentar registrar.
function tentarRegistrarNoLayerControl(map, nomeArquivo, layer) {
    // 🛑 Cria o controle só agora, e garante o título depois
    if (!map._geoFileLayersControl) {
        const controleImportados = L.control.layers(null, {}, {
            collapsed: true,
            position: 'topright'
        }).addTo(map)

        controleImportados.getContainer().classList.add('geo-file-layer-control')
        controleImportados.getContainer().classList.add('import-layer-control')
        map._geoFileLayersControl = controleImportados
    }

    // ✅ Registra camada
    registrarNoLayerControl(map, nomeArquivo, layer)
}

// 🗂️ registrarNoLayerControl:
// Remove extensão do nome, insere título do grupo se necessário e adiciona o overlay.
function registrarNoLayerControl(map, nomeArquivo, layer) {
    const nomeCamada = removerExtensao(nomeArquivo)       // 🧼 Nome limpo.
    adicionarOverlayImportado(map, layer, nomeCamada)     // 📄 Entrada registrada no controle.
}

// 🧽 removerExtensao:
// Remove extensão do nome do arquivo (ex: .geojson, .zip).
function removerExtensao(nomeArquivo) {
    return nomeArquivo.replace(/\.[^/.]+$/, '')
}

// 🏷️ criarTituloCamadas:
// Cria um separador visual com o título do grupo de camadas importadas.
function criarTituloCamadas() {
    const el = L.DomUtil.create('div')
    el.innerHTML = '<strong style="font-size: 14px">📁 Camadas Importadas</strong>'
    return el
}

/**
 * == Registro de Overlays Importados ==
 * Este módulo insere camadas geográficas no controle visual do Leaflet
 * e adiciona, se necessário, um cabeçalho visual agrupador.
 */

// 📥 obterListaOverlays:
// Retorna o container HTML onde ficam os overlays (checkboxes de camadas).
function obterListaOverlays(map) {
    const container = map._geoFileLayersControl.getContainer();
    return container.querySelector('.leaflet-control-layers-overlays');
}

// 🔎 inserirTituloSeFaltando:
// Verifica se já existe um separador/título. Se não, insere no topo da lista.
function inserirTituloSeFaltando(lista) {
    const jaExiste = !!lista.querySelector('.leaflet-control-layers-separator');
    if (!jaExiste) {
        const header = criarTituloCamadas(); // 📁 Cabeçalho "Camadas Importadas"
        lista.insertBefore(header, lista.firstChild);
    }
}

// 🧠 inserirTituloSeNecessario:
// Executa a verificação no contexto do mapa.
function inserirTituloSeNecessario(map) {
    const lista = obterListaOverlays(map);
    if (lista) {
        inserirTituloSeFaltando(lista);
    }
}

// ➕ adicionarOverlayImportado:
// Registra uma nova camada no controle visual de overlays do Leaflet,
// e garante que o título de seção seja inserido (caso ainda não exista).
function adicionarOverlayImportado(map, layer, nomeCamada) {
    map._geoFileLayersControl.addOverlay(layer, `📄 ${nomeCamada}`);

    // ⚙️ Usa setTimeout para aguardar renderização DOM da nova camada
    setTimeout(() => {
        inserirTituloSeNecessario(map);
    }, 0);
}

//
// == Erros ==
// Responsável por interceptar falhas ao carregar arquivos geográficos.
// Fornece feedback ao operador de forma clara e imediata.
//

// ⚠️ lidarComErroDeArquivo:
// Handler simples e direto para erros ao ler arquivos (ex: GeoJSON, shapefile, etc).
// Loga o erro no console e alerta o operador com uma mensagem amigável.
function lidarComErroDeArquivo(err) {
    console.error('Erro ao carregar arquivo:', err)  // 📟 Log técnico para diagnóstico.
    alert('Erro ao ler arquivo geográfico.')         // 📢 Feedback direto ao usuário.
}

