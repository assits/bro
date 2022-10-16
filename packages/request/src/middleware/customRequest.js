import httpAdapter from 'axios/lib/adapters/http'
import xhrAdapter from 'axios/lib/adapters/xhr'
import {
  timeout2Throw,
  cancel2Throw,
  getEnv,
  isString,
  isFunction,
} from '../utils'

const adapters = {
  http: httpAdapter,
  xhr: xhrAdapter
}

function getAdapter(nameOrAdapter) {
  return isString(nameOrAdapter) ? adapters[nameOrAdapter] : null
}

function getDefaultAdapter() {
  let adapter
  const env = getEnv()
  if (env === 'BROWSER') {
    // For browsers use XHR adapter
    adapter = getAdapter('xhr')
  } else if (env === 'NODE') {
    // For node use HTTP adapter
    adapter = getAdapter('http')
  }
  return adapter
}

export default function customRequestMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {} } = {}, responseInterceptorChain = [] } = ctx
  const {
    timeout = 0,
    timeoutMessage,
    charset = 'utf8',
    responseType = 'json'
  } = options

  if (options.adapter === 'fetch') return next()

  const adapter =
    options.adapter === 'axios' ? getDefaultAdapter() : options.adapter

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
