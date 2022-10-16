import pollingPlugin from './plugins/polling'
import retryPlugin from './plugins/retry'
import debouncePlugin from './plugins/debounce'
import throttlePlugin from './plugins/throttle'
import cachePlugin from './plugins/cache'
import loadingDelayPlugin from './plugins/loading-delay'
import requestEnhancer from './enhancer'
import { isString, isObject } from '../utils'

// 支持防抖、节流
// 轮询、错误重试
// 支持缓存，取消并发重复请求
// 支持加载延时

export function useEnhancer(adapter) {
  return (service, options, plugins) => {
    let promiseService

    if (isString(service) || isObject(service)) {
      promiseService = () => adapter(service)
    } else {
      promiseService = (...args) => {
        return new Promise((resolve, reject) => {
          const result = service(...args)

          if (isString(service) || isObject(service)) {
            adapter(result).then(resolve, reject)
          }
        })
      }
    }

    return requestEnhancer(promiseService, options, [
      ...(plugins || []),
      debouncePlugin,
      throttlePlugin,
      cachePlugin,
      pollingPlugin,
      retryPlugin,
      loadingDelayPlugin
    ])
  }
}

function useRequest(service, options, plugins) {
  return requestEnhancer(service, options, [
    ...(plugins || []),
    debouncePlugin,
    throttlePlugin,
    cachePlugin,
    pollingPlugin,
    retryPlugin,
    loadingDelayPlugin
  ])
}

export default useRequest
