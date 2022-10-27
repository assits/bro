import pollingPlugin from './plugins/polling'
import retryPlugin from './plugins/retry'
import debouncePlugin from './plugins/debounce'
import throttlePlugin from './plugins/throttle'
import cachePlugin from './plugins/cache'
import loadingDelayPlugin from './plugins/loading-delay'
import autoRunPlugin from './plugins/auto-run'
import useEnhancer from './enhancer'
import useEnhancerByVue from './enhancer-vue'

// 支持防抖、节流
// 轮询、错误重试
// 支持缓存，取消并发重复请求
// 支持加载延时
// 支持依赖变化，自动刷新

function useRequest(service, options, plugins) {
  return useEnhancer(service, options, [
    ...(plugins || []),
    debouncePlugin,
    throttlePlugin,
    cachePlugin,
    pollingPlugin,
    retryPlugin,
    loadingDelayPlugin
  ])
}

function useRequestByVue(service, options, plugins) {
  return useEnhancerByVue(service, options, [
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

export { useRequest, useRequestByVue }
