import { parse, stringify } from 'qs'
import { isArray, isProcess, isURLSearchParams, isFunction } from './is'

export * from './is'

export class MapCache {
  constructor(options) {
    this.cache = new Map()
    this.timer = {}
    this.extendOptions(options)
  }

  extendOptions(options) {
    this.maxCache = options.maxCache || 0
  }

  get(key) {
    return this.cache.get(JSON.stringify(key))
  }

  set(key, value, ttl = 60000) {
    // 如果超过最大缓存数, 删除头部的第一个缓存.
    if (this.maxCache > 0 && this.cache.size >= this.maxCache) {
      const deleteKey = [...this.cache.keys()][0]
      this.cache.delete(deleteKey)
      if (this.timer[deleteKey]) {
        clearTimeout(this.timer[deleteKey])
      }
    }
    const cacheKey = JSON.stringify(key)
    this.cache.set(cacheKey, value)
    if (ttl > 0) {
      this.timer[cacheKey] = setTimeout(() => {
        this.cache.delete(cacheKey)
        delete this.timer[cacheKey]
      }, ttl)
    }
  }

  delete(key) {
    const cacheKey = JSON.stringify(key)
    delete this.timer[cacheKey]
    return this.cache.delete(cacheKey)
  }

  clear() {
    this.timer = {}
    return this.cache.clear()
  }
}

/**
 * 请求异常
 */
export class RequestError extends Error {
  constructor(text, request, type = 'RequestError') {
    super(text)
    this.name = 'RequestError'
    this.request = request
    this.type = type
  }
}

/**
 * 响应异常
 */
export class ResponseError extends Error {
  constructor(response, text, data, request, type = 'ResponseError') {
    super(text || response.statusText)
    this.name = 'ResponseError'
    this.data = data
    this.response = response
    this.request = request
    this.type = type
  }
}

/**
 * http://gitlab.alipay-inc.com/KBSJ/gxt/blob/release_gxt_S8928905_20180531/src/util/request.js#L63
 * 支持gbk
 */
export function readerGBK(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.onerror = reject
    reader.readAsText(file, 'GBK') // setup GBK decoding
  })
}

/**
 * 安全的JSON.parse
 */
export function safeJsonParse(
  data,
  throwErrIfParseFail = false,
  response = null,
  request = null
) {
  try {
    return JSON.parse(data)
  } catch (e) {
    if (throwErrIfParseFail) {
      throw new ResponseError(
        response,
        'JSON.parse fail',
        data,
        request,
        'ParseError'
      )
    }
  } // eslint-disable-line no-empty
  return data
}

export function timeout2Throw(msec, timeoutMessage, request) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new RequestError(
          timeoutMessage || `timeout of ${msec}ms exceeded`,
          request,
          'Timeout'
        )
      )
    }, msec)
  })
}

// If request options contain 'cancelToken', reject request when token has been canceled
export function cancel2Throw(opt) {
  return new Promise((_, reject) => {
    if (opt.cancelToken) {
      opt.cancelToken.promise.then(cancel => {
        reject(cancel)
      })
    }
  })
}

// Check env is browser or node
export function getEnv() {
  let env
  // Only Node.JS has a process variable that is of [[Class]] process
  if (isProcess(process)) {
    // For node use HTTP adapter
    env = 'NODE'
  }
  if (typeof XMLHttpRequest !== 'undefined') {
    env = 'BROWSER'
  }
  return env
}

export function forEach2ObjArr(target, callback) {
  if (!target) return

  if (typeof target !== 'object') {
    target = [target]
  }

  if (isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      callback.call(null, target[i], i, target)
    }
  } else {
    for (let key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        callback.call(null, target[key], key, target)
      }
    }
  }
}

export function getParamObject(val) {
  if (isURLSearchParams(val)) {
    return parse(val.toString(), { strictNullHandling: true })
  }
  if (typeof val === 'string') {
    return [val]
  }
  return val
}

export function reqStringify(val, opts = {}) {
  return stringify(val, {
    arrayFormat: 'repeat',
    strictNullHandling: true,
    ...opts
  })
}

export function mergeRequestOptions(options, options2Merge) {
  return {
    ...options,
    ...options2Merge,
    headers: {
      ...options.headers,
      ...options2Merge.headers
    },
    params: {
      ...getParamObject(options.params),
      ...getParamObject(options2Merge.params)
    },
    method: (options2Merge.method || options.method || 'get').toLowerCase()
  }
}

export function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments)
  }
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Boolean} [allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
export function extend(a, b, thisArg) {
  forEach2ObjArr(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg)
    } else {
      a[key] = val
    }
  })
  return a
}

export const hasOwnProp = (({ hasOwnProperty }) => (obj, prop) =>
  hasOwnProperty.call(obj, prop))(Object.prototype)

// 拼接路径
export function pathJoin(...args) {
  const arr = args || []
  const str = arr.reduce(
    (memo, cur) => (memo += typeof cur === 'string' ? cur + '/' : ''),
    ''
  )
  return str.replace(/\/\/+/g, '/').replace(/\/$/, '')
}
