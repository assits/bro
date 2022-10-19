import { RequestError, ResponseError, clearCache } from './utils'
import adapterMiddleware from './middleware/customRequest'
import request, { extend, fetch } from './core'
import useRequest, { useEnhancer } from './enhancer'

export {
  RequestError,
  ResponseError,
  fetch,
  extend,
  clearCache,
  useRequest,
  useEnhancer,
  adapterMiddleware
}

export default request
