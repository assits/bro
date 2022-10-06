export default class Onion {
  constructor(defaultMiddlewares) {
    if (!Array.isArray(defaultMiddlewares))
      throw new TypeError('Default middlewares must be an array!')
    this.defaultMiddlewares = [...defaultMiddlewares]
    this.middlewares = []
  }

  static globalMiddlewares = [] // 全局中间件
  static defaultGlobalMiddlewaresLength = 0 // 内置全局中间件长度
  static coreMiddlewares = [] // 内核中间件
  static defaultCoreMiddlewaresLength = 0 // 内置内核中间件长度

  use(
    newMiddleware,
    opts = { global: false, core: false, defaultInstance: false }
  ) {
    let core = false
    let global = false
    let defaultInstance = false

    if (typeof opts === 'number') {
      if (process && process.env && process.env.NODE_ENV === 'development') {
        console.warn(
          'use() options should be object, number property would be deprecated in future，please update use() options to "{ core: true }".'
        )
      }
      core = true
      global = false
    } else if (typeof opts === 'object' && opts) {
      global = opts.global || false
      core = opts.core || false
      defaultInstance = opts.defaultInstance || false
    }

    // 全局中间件
    if (global) {
      Onion.globalMiddlewares.splice(
        Onion.globalMiddlewares.length - Onion.defaultGlobalMiddlewaresLength,
        0,
        newMiddleware
      )
      return
    }
    // 内核中间件
    if (core) {
      Onion.coreMiddlewares.splice(
        Onion.coreMiddlewares.length - Onion.defaultCoreMiddlewaresLength,
        0,
        newMiddleware
      )
      return
    }

    // 默认实例中间件，供开发者使用
    if (defaultInstance) {
      this.defaultMiddlewares.push(newMiddleware)
      return
    }

    // 实例中间件
    this.middlewares.push(newMiddleware)
  }

  compose(middlewares) {
    if (!Array.isArray(middlewares))
      throw new TypeError('Middlewares must be an array!')

    const middlewaresLen = middlewares.length
    for (let i = 0; i < middlewaresLen; i++) {
      if (typeof middlewares[i] !== 'function') {
        throw new TypeError('Middleware must be componsed of function')
      }
    }

    return function wrapMiddlewares(params, next) {
      let index = -1
      function dispatch(i) {
        if (i <= index) {
          return Promise.reject(
            new Error(
              'next() should not be called multiple times in one middleware!'
            )
          )
        }
        index = i
        const fn = middlewares[i] || next
        if (!fn) return Promise.resolve()
        try {
          return Promise.resolve(fn(params, () => dispatch(i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      }

      return dispatch(0)
    }
  }

  execute(params = null) {
    const fn = this.compose([
      ...this.middlewares,
      ...this.defaultMiddlewares,
      ...Onion.globalMiddlewares,
      ...Onion.coreMiddlewares
    ])
    return fn(params)
  }
}
