import { reqStringify, isObject, isArray } from '../utils'

// 对请求参数做处理，实现 query 简化、 post 简化
export default function postMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {} } = {} } = ctx
  const { method = 'get', requestType = 'json', data } = options

  if (['post', 'put', 'patch', 'delete'].indexOf(method.toLowerCase()) === -1) {
    return next()
  }

  if (!data) return next()

  // XMLHttpRequest/自定义 adapter  使用的数据
  if (options.adapter || options.adapter === 'axios') {
    if (requestType === 'json') {
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        ...options.headers
      }

      options.body = JSON.stringify(data)
    } else if (requestType === 'form') {
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        ...options.headers
      }

      options.body = reqStringify(data, {
        arrayFormat: 'repeat',
        strictNullHandling: true
      })
    } else {
      options.headers = {
        Accept: 'application/json',
        ...options.headers
      }

      options.body = data
    }

    ctx.req.options = options
    return next()
  }

  // Fetch 数据使用类axios的新字段data, 避免引用后影响旧代码, 如将body stringify多次
  if (isObject(data) || isArray(data)) {
    if (requestType === 'json') {
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        ...options.headers
      }

      options.body = JSON.stringify(data)
    } else if (requestType === 'form') {
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        ...options.headers
      }

      options.body = reqStringify(data, {
        arrayFormat: 'repeat',
        strictNullHandling: true
      })
    }
  } else {
    // 其他 requestType 自定义header
    options.headers = {
      Accept: 'application/json',
      ...options.headers
    }
    options.body = data
  }

  ctx.req.options = options

  return next()
}
