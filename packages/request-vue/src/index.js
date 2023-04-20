import {
  pollingPlugin,
  retryPlugin,
  debouncePlugin,
  throttlePlugin,
  cachePlugin,
  loadingDelayPlugin,
  extend,
  RequestError,
  ResponseError,
  clearCache
} from '@assits/request'
import autoRunPlugin from './plugins/auto-run'
import { createEnhancer } from './enhancer'

// 支持防抖、节流
// 轮询、错误重试
// 支持缓存，取消并发重复请求
// 支持加载延时
// 支持依赖变化，自动刷新

function useRequest(service, options, plugins) {
  return createEnhancer(service, options, [
    ...(plugins || []),
    autoRunPlugin,
    debouncePlugin,
    throttlePlugin,
    cachePlugin,
    pollingPlugin,
    retryPlugin,
    loadingDelayPlugin
  ])
}

export { RequestError, ResponseError, clearCache, extend, useRequest }
