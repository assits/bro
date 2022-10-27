import { RequestError, ResponseError, clearCache } from './utils'
import request, { extend } from './core'
import { useRequest, useRequestByVue } from './enhancer'

export {
  RequestError,
  ResponseError,
  extend,
  clearCache,
  useRequest,
  useRequestByVue
}

export default request
