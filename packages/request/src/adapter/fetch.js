import fetchAdapter from 'isomorphic-fetch'
import { extend } from '../core'

export const extendFetch = (initOptions = {}) => {
  return extend({
    ...initOptions,
    adapter: fetchAdapter,
    adapterName: 'fetch'
  })
}
