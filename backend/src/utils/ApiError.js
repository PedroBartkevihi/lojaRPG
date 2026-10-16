export class ApiError extends Error {
  // `details` vai junto na resposta (ex.: os erros de cada linha de uma
  // importacao), alem da mensagem.
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
