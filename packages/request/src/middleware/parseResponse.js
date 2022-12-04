import {
  safeJsonParse,
  readerGBK,
  ResponseError,
  getEnv,
  RequestError
} from '../utils'

export default function parseResponseMiddleware(ctx, next) {
  let copy
  return next()
    .then(() => {
      if (!ctx) return
      const { res = {}, req = {}, adapterName = 'custom' } = ctx
      const {
        options: {
          responseType = 'json',
          charset = 'utf8',
          throwErrIfParseFail = false,
          parseResponse = true
        } = {}
      } = req || {}
      const isFetchAdapter = adapterName === 'fetch'

      if (!parseResponse || !res || (isFetchAdapter && !res.clone)) {
        return
      }

      copy = isFetchAdapter ? (getEnv() === 'BROWSER' ? res.clone() : res) : res
      isFetchAdapter && (copy.useCache = res.useCache || false)

      // 解析数据
      if (charset === 'gbk') {
        try {
          return isFetchAdapter
            ? res
                .blob()
                .then(readerGBK)
                .then(d => safeJsonParse(d, false, copy, req))
            : readerGBK(res.data)
        } catch (e) {
          throw new ResponseError(copy, e.message, null, req, 'ParseError')
        }
      } else if (responseType === 'json') {
        return isFetchAdapter
          ? res
              .text()
              .then(d => safeJsonParse(d, throwErrIfParseFail, copy, req))
          : safeJsonParse(res.data, throwErrIfParseFail, copy, req)
      }

      try {
        // 其他如text, blob, arrayBuffer, formData
        return isFetchAdapter ? res[responseType]() : res.data
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
        return
      }

      // 兼容小程序
      copy.status = copy.status || copy.statusCode

      if (copy.status >= 200 && copy.status < 300) {
        // 提供源response, 以便自定义处理
        if (getResponse) {
          copy.config = req.options
          ctx.res = { data: body, response: copy }
        } else {
          ctx.res = body
        }

        return
      }

      throw new ResponseError(copy, 'http error', body, req, 'HttpError')
    })
    .catch(e => {
      if (e instanceof RequestError || e instanceof ResponseError) {
        throw e
      }

      if (e instanceof Error) {
        // 对未知错误进行处理
        const { req, res } = ctx
        e.request = e.request || req
        e.response = e.response || res
        e.type = e.type || e.name
        e.data = e.data || undefined
        throw e
      }

      throw e
    })
}
