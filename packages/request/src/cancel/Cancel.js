/**
 * 当执行 “取消请求” 操作时会抛出 Cancel 对象作为异常
 * @class
 * @param {string=} message The message.
 */

export default class Cancel {
  constructor(message) {
    this.message = message
    this.__CANCEL__ = true
  }

  toString() {
    return this.message ? `Cancel: ${this.message}` : 'Cancel'
  }
}
