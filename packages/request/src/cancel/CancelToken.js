import Cancel from './Cancel'

/**
 * 通过 CancelToken 来取消请求操作
 *
 * @class
 * @param {Function} executor The executor function.
 */

export default class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.')
    }

    let resolvePromise
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve
    })

    const token = this
    executor(function cancel(message) {
      // 取消操作已被调用过
      if (token.reason) {
        return
      }

      token.reason = new Cancel(message)
      resolvePromise(token.reason)
    })
  }

  static source() {
    let cancel
    const token = new CancelToken(function executor(c) {
      cancel = c
    })
    return {
      token,
      cancel
    }
  }

  throwIfRequested() {
    if (this.reason) {
      throw this.reason
    }
  }
}
