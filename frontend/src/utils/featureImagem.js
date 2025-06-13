//
// == src/utils/featureImagem.js ==
// Este módulo extrai uma URL de imagem associada a uma feature geográfica.
// Suporta tanto ícones personalizados injetados quanto parsing textual bruto.
//

// 🧲 extrairURLImagemDeDescricao:
// Função principal — tenta obter a URL de um ícone, seja do campo
// _iconePersonalizado ou varrendo o conteúdo da feature.
export function extrairURLImagemDeDescricao(feature) {
  const personalizada = acessarIconePersonalizado(feature); // 🎯 Ícone previamente injetado
  return personalizada || extrairURLDeTextoPlano(feature);  // 🔍 Fallback por regex
}

// 🎯 acessarIconePersonalizado:
// Lê o campo _iconePersonalizado, caso tenha sido adicionado anteriormente (ex: via KML).
function acessarIconePersonalizado(f) {
  const props = acessarPropriedadesSeguras(f);
  return props._iconePersonalizado || '';
}

// 🛡️ acessarPropriedadesSeguras:
// Retorna props de forma segura, evitando exceções em estruturas incompletas.
function acessarPropriedadesSeguras(f) {
  return possuiProperties(f) ? f.properties : {};
}

// ✅ possuiProperties:
// Verifica se o objeto possui campo .properties.
function possuiProperties(f) {
  return Boolean(f) && Boolean(f.properties);
}

// 🔍 extrairURLDeTextoPlano:
// Converte a feature para texto e procura uma URL de imagem usando regex.
// Útil para casos onde a imagem está embutida na descrição textual.
function extrairURLDeTextoPlano(f) {
  const texto = JSON.stringify(f);                 // 📦 Transforma tudo em texto
  const resultado = texto.match(obterRegexImagem()); // 🧪 Aplica regex de imagem
  return extrairPrimeiraCaptura(resultado);        // 🎯 Retorna o primeiro match
}

// 🔬 obterRegexImagem:
// Regex para identificar imagens com extensão comum (jpg, png, gif).
function obterRegexImagem() {
  return /https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif)/i;
}

// 🎯 extrairPrimeiraCaptura:
// Retorna o primeiro resultado da regex ou string vazia.
function extrairPrimeiraCaptura(match) {
  return match ? match[0] : '';
}
