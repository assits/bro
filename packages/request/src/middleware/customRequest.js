import httpAdapter from 'axios/lib/adapters/http'
import xhrAdapter from 'axios/lib/adapters/xhr'
import {
  timeout2Throw,
  cancel2Throw,
  getEnv,
  isString,
  isFunction,
  readerGBK,
  safeJsonParse,
  RequestError,
  ResponseError
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
  const { req: { options = {} } = {} } = ctx
  const {
    timeout = 0,
    timeoutMessage,
    charset = 'utf8',
    responseType = 'json'
  } = options

  if (options.adapter === 'fetch') return next()

  const adapter =
    options.adapter === 'XMLHttpRequest' ? getDefaultAdapter() : options.adapter

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

  let copy

  return response
    .then(res => {
      ctx.res = res
    })
    .then(() => {
      const { res = {}, req = {} } = ctx
      const {
        options: {
          responseType = 'json',
          charset = 'utf8',
          throwErrIfParseFail = false,
          parseResponse = true
        } = {}
      } = req || {}

      if (!parseResponse || !res) {
        return
      }

      copy = res

      // 解析数据
      if (charset === 'gbk') {
        try {
          return readerGBK(res.data)
        } catch (e) {
          throw new ResponseError(copy, e.message, null, req, 'ParseError')
        }
      } else if (responseType === 'json') {
        return safeJsonParse(res.data, throwErrIfParseFail, copy, req)
      }

      return res.data
    })
    .then(body => {
      const { req = {} } = ctx
      const { options: { getResponse = false } = {} } = req || {}

      if (!copy) {
        return next()
      }

      if (copy.status >= 200 && copy.status < 300) {
        // 提供源response, 以便自定义处理
        if (getResponse) {
          ctx.res = { data: body, response: copy }
        } else {
          ctx.res = body
        }

        return next()
      }

      throw new ResponseError(copy, 'http error', body, req, 'HttpError')
    })
    .catch(e => {
      if (e instanceof RequestError || e instanceof ResponseError) {
        throw e
      }
      // 对未知错误进行处理
      const { req, res } = ctx
      e.request = e.request || req
      e.response = e.response || res
      e.type = e.type || e.name
      e.data = e.data || undefined
      throw e
    })
}
