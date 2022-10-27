import axios from 'axios'
import { timeout2Throw, cancel2Throw, isFunction } from '../utils'

export default function customRequestMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {} } = {}, responseInterceptorChain = [] } = ctx
  const {
    timeout = 0,
    timeoutMessage,
    charset = 'utf8',
    responseType = 'json'
  } = options

  if (ctx.adapter === 'fetch') return next()

  const adapter = ctx.adapter === 'axios' ? axios : ctx.adapter

  if (!isFunction(adapter)) {
    throw new Error('Adapter is not available in the build')
  }

  const adapterOptions = {
    ...options,
    timeout,
    timeoutMessage,
    charset,
    responseType,
    data: options.body || null,
    withCredentials:
      'withCredentials' in options
        ? !!options.withCredentials
        : options.credentials !== 'omit'
  }

  delete adapterOptions.adapter

  if (charset === 'gbk') {
    adapterOptions.responseType = 'arraybuffer'
  }

  let response
  // 超时处理、取消请求处理
  if (timeout > 0) {
    response = Promise.race([
      cancel2Throw(adapterOptions, ctx),
      adapter(adapterOptions),
      timeout2Throw(timeout, timeoutMessage, ctx.req)
    ])
  } else {
    response = Promise.race([
      cancel2Throw(adapterOptions, ctx),
      adapter(adapterOptions)
    ])
  }

  // 响应拦截器
  let i = 0
  while (i < responseInterceptorChain.length) {
    response = response.then(
      responseInterceptorChain[i++],
      responseInterceptorChain[i++]
    )
  }

  return response.then(res => {
    ctx.res = res
    return next()
  })
}
