import Onion from './Onion'
import InterceptorManager from './InterceptorManager'
import addfixMiddleware from './middleware/addfix'
import fetchMiddleware from './middleware/fetch'
import customRequestMiddleware from './middleware/customRequest'
import postMiddleware from './middleware/post'
import getMiddleware from './middleware/get'
import { mergeRequestOptions } from './utils'

// 初始化全局和内核中间件
const globalMiddlewares = [addfixMiddleware, postMiddleware, getMiddleware]
const coreMiddlewares = [fetchMiddleware, customRequestMiddleware]

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

  handleInterceptors(
    interceptors,
    config = {},
    ctx = {},
    isRequestInterceptor = true
  ) {
    let i = 0
    let promise = Promise.resolve(config)
    const len = interceptors.length

    while (i < len) {
      promise = promise.then(ret => {
        if (isRequestInterceptor) {
          ctx.req.url = ret.url || ctx.req.url
          ctx.req.options = ret.options || ctx.req.options
        }
        return interceptors[i++](ret, ctx)
      }, interceptors[i++])
    }

    return promise
  }

  request(optionsOrUrl, options = {}) {
    if (typeof optionsOrUrl === 'string') {
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
      req: { url: optionsOrUrl.url, options },
      res: null
    }

    return new Promise((resolve, reject) => {
      this.handleInterceptors(requestInterceptorChain, options, context)
        .then(() => this.onion.execute(context))
        .then(() =>
          this.handleInterceptors(
            responseInterceptorChain,
            context.res,
            context,
            false
          )
        )
        .then(response => resolve(response))
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
