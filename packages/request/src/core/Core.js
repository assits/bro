import Onion from './Onion'
import InterceptorManager from './InterceptorManager'
import addfixMiddleware from '../middleware/addfix'
import fetchMiddleware from '../middleware/fetch'
import postMiddleware from '../middleware/post'
import getMiddleware from '../middleware/get'
import parseResponseMiddleware from '../middleware/parseResponse'
import { mergeRequestOptions, isString } from '../utils'

// 初始化全局和内核中间件
const globalMiddlewares = [
  addfixMiddleware,
  postMiddleware,
  getMiddleware,
  parseResponseMiddleware
]
const coreMiddlewares = [fetchMiddleware]

Onion.globalMiddlewares = globalMiddlewares
Onion.defaultGlobalMiddlewaresLength = globalMiddlewares.length
Onion.coreMiddlewares = coreMiddlewares
Onion.defaultCoreMiddlewaresLength = coreMiddlewares.length

export default class Core {
  constructor(instanceConfig) {
    this.instanceConfig = instanceConfig
    this.onion = new Onion([])
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    }
  }

  extendOptions(options) {
    this.instanceConfig = mergeRequestOptions(this.instanceConfig, options)
  }

  use(newMiddleware, opt = { global: false, core: false }) {
    this.onion.use(newMiddleware, opt)
    return this
  }

  handleInterceptors(interceptors, config = {}, ctx = {}) {
    let i = 0
    let promise = Promise.resolve(config)
    const len = interceptors.length

    while (i < len) {
      promise = promise
        .then(ret => {
          ctx.req.url = ret.url || ctx.req.url
          ctx.req.options = ret || ctx.req.options
          return ret
        })
        .then(interceptors[i++], interceptors[i++])
    }

    return promise
  }

  request(optionsOrUrl, options = {}) {
    if (isString(optionsOrUrl)) {
      options.url = optionsOrUrl
    } else {
      options = optionsOrUrl || {}
    }

    options = mergeRequestOptions(this.instanceConfig, options)

    // 过滤掉跳过的拦截器
    const requestInterceptorChain = []
    this.interceptors.request.forEach(function unshiftRequestInterceptors(
      interceptor
    ) {
      if (
        typeof interceptor.runWhen === 'function' &&
        interceptor.runWhen(options) === false
      ) {
        return
      }

      requestInterceptorChain.unshift(
        interceptor.fulfilled,
        interceptor.rejected
      )
    })

    const responseInterceptorChain = []
    this.interceptors.response.forEach(function pushResponseInterceptors(
      interceptor
    ) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected)
    })

    const context = {
      req: { url: options.url, options },
      res: null,
      responseInterceptorChain
    }

    return new Promise((resolve, reject) => {
      this.handleInterceptors(requestInterceptorChain, options, context)
        .then(() => this.onion.execute(context))
        .then(() => resolve(context.res))
        .catch(error => {
          const { errorHandler } = context.req.options
          if (errorHandler) {
            try {
              const data = errorHandler(error)
              resolve(data)
            } catch (e) {
              reject(e)
            }
          } else {
            reject(error)
          }
        })
    })
  }
}
