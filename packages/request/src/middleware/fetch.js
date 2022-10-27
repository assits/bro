import 'isomorphic-fetch'
import { timeout2Throw, cancel2Throw } from '../utils'

export default function fetchMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { url, options = {} } = {}, responseInterceptorChain = [] } = ctx
  const { timeout = 0, timeoutMessage } = options

  if (ctx.adapter && ctx.adapter !== 'fetch') return next()

  const adapter = fetch

  if (!adapter) {
    throw new Error('Global fetch not exist!')
  }

  ctx.adapter = 'fetch'

  delete options.adapter

  let response
  // 超时处理、取消请求处理
  if (timeout > 0) {
    response = Promise.race([
      cancel2Throw(options, ctx),
      adapter(url, options),
      timeout2Throw(timeout, timeoutMessage, ctx.req)
    ])
  } else {
    response = Promise.race([cancel2Throw(options, ctx), adapter(url, options)])
  }

  // 响应拦截器
  let i = 0
  while (i < responseInterceptorChain.length) {
    response = response
      .then(res => {
        return typeof res.clone === 'function' ? res.clone() : res
      })
      .then(responseInterceptorChain[i++], responseInterceptorChain[i++])
  }

  return response.then(res => {
    ctx.res = res
    return next()
  })
}
