export class MessageError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
  }

  code;
}
