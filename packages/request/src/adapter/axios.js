import axiosAdapter from 'axios'
import { extend } from '../core'

export const extendAxios = (initOptions = {}) => {
  return extend({
    ...initOptions,
    adapter: axiosAdapter,
    adapterName: 'axios'
  })
}
