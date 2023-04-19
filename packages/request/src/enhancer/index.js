import pollingPlugin from './plugins/polling'
import retryPlugin from './plugins/retry'
import debouncePlugin from './plugins/debounce'
import throttlePlugin from './plugins/throttle'
import cachePlugin from './plugins/cache'
import loadingDelayPlugin from './plugins/loading-delay'
import { createEnhancer } from './enhancer'

export {
  pollingPlugin,
  retryPlugin,
  debouncePlugin,
  throttlePlugin,
  cachePlugin,
  loadingDelayPlugin
}

export * from './Fetch'

// 支持防抖、节流
// 轮询、错误重试
// 支持缓存，取消并发重复请求
// 支持加载延时

export function useRequest(service, options, plugins) {
  return createEnhancer(service, options, [
    ...(plugins || []),
    debouncePlugin,
    throttlePlugin,
    cachePlugin,
    pollingPlugin,
    retryPlugin,
    loadingDelayPlugin
  ])
}
