// apis/shared/middleware/auth.js
/**
 * Middleware de autenticação placeholder.
 * Neste ponto você pode validar JWT, checar headers, etc.
 * Para já fazer o v2 subir sem bloquear nada, ele apenas chama next().
 */
export default function authMiddleware(req, res, next) {
  // TODO: implemente validação real aqui
  next()
}
