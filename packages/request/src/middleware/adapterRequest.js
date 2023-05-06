import { timeout2Throw, cancel2Throw, isFunction } from '../utils'

export default function customRequestMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { url, options = {} } = {}, responseInterceptorChain = [] } = ctx
  const { timeout = 10 * 1000, timeoutMessage, charset = 'utf8' } = options

  const isAxios = ctx.adapterName === 'axios'
  const isFetch = ctx.adapterName === 'fetch'
  const isCustom = ctx.adapterName === 'custom'

  const adapter = ctx.adapter

  if (!isFunction(adapter)) {
    throw new Error('Adapter is not available in the build')
  }

  let adapterOptions = {
    ...options
  }

  if (isAxios || isCustom) {
    adapterOptions = {
      ...options,
      url: ctx.req.originUrl || options.url,
      timeout,
      timeoutMessage,
      charset,
      data: options.method === 'GET' ? options.data : options.body,
      withCredentials: !!options.withCredentials
    }

    if (charset === 'gbk') {
      adapterOptions.responseType = 'arraybuffer'
    }
  }

  delete adapterOptions.adapter

  let response
  // 超时处理、取消请求处理
  if (timeout > 0) {
    response = Promise.race([
      cancel2Throw(adapterOptions, ctx),
      isFetch ? adapter(url, adapterOptions) : adapter(adapterOptions),
      timeout2Throw(timeout, timeoutMessage, ctx.req)
    ])
  } else {
    response = Promise.race([
      cancel2Throw(adapterOptions, ctx),
      isFetch ? adapter(url, adapterOptions) : adapter(adapterOptions)
    ])
  }

  // 响应拦截器
  let i = 0
  while (i < responseInterceptorChain.length) {
    response = response
      .then(res => {
        res = typeof res.clone === 'function' ? res.clone() : res
        res.config = adapterOptions
        return res
      })
      .then(responseInterceptorChain[i++])
      .catch(responseInterceptorChain[i++])
  }

  return response.then(res => {
    ctx.res = res
    return next()
  })
}
