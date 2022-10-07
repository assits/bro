import 'isomorphic-fetch'
import {
  timeout2Throw,
  cancel2Throw,
  safeJsonParse,
  readerGBK,
  ResponseError,
  getEnv,
  RequestError
} from '../utils'

export default function fetchMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {}, url = '' } = {} } = ctx
  const { timeout = 0, timeoutMessage } = options

  if (options.adapter && options.adapter !== 'fetch') return next()

  const adapter = fetch

  if (!adapter) {
    throw new Error('Global fetch not exist!')
  }

  ctx.req.options.adapter = 'fetch'

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

      if (!parseResponse || !res || !res.clone) {
        return
      }

      // 只在浏览器环境对 response 做克隆， node 环境如果对 response 克隆会有问题
      copy = getEnv() === 'BROWSER' ? res.clone() : res
      copy.useCache = res.useCache || false

      // 解析数据
      if (charset === 'gbk') {
        try {
          return res
            .blob()
            .then(readerGBK)
            .then(d => safeJsonParse(d, false, copy, req))
        } catch (e) {
          throw new ResponseError(copy, e.message, null, req, 'ParseError')
        }
      } else if (responseType === 'json') {
        return res
          .text()
          .then(d => safeJsonParse(d, throwErrIfParseFail, copy, req))
      }

      try {
        // 其他如text, blob, arrayBuffer, formData
        return res[responseType]()
      } catch (e) {
        throw new ResponseError(
          copy,
          'responseType not support',
          null,
          req,
          'ParseError'
        )
      }
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
          copy.config = req.options
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
