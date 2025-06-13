// apis/shared/clients/httpClient.js
//
// Este é um wrapper mínimo em cima do axios.
// Nos testes, o nock irá interceptar as chamadas que passam por aqui.

import axios from 'axios'

export default {
  get: (url, options) => axios.get(url, options)
  // você pode adicionar post, put, delete etc se precisar mais tarde
}
