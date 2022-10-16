import { RequestError, ResponseError, clearCache } from './utils'
import request, { extend, fetch } from './core'
import useRequest, { useEnhancer } from './enhancer'

export {
  RequestError,
  ResponseError,
  fetch,
  extend,
  clearCache,
  useRequest,
  useEnhancer
}

export default request
