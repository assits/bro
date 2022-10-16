import {
  cache,
  getCachePromise,
  setCachePromise,
  trigger,
  subscribe
} from '../../utils/cache'

const cachePlugin = (
  instance,
  { cacheKey, cacheTime = 5 * 60 * 1000, staleTime = 0, setCache, getCache }
) => {
  let unSubscribe = null
  let currentPromise = null

  const _setCache = (key, cachedData) => {
    if (setCache) {
      setCache(cachedData)
    } else {
      cache.set(key, cachedData, cacheTime)
    }
    trigger(key, cachedData.data)
  }

  const _getCache = (key, params = []) => {
    if (getCache) {
      return getCache(params)
    }
    return cache.get(key)
  }

  const create = () => {
    if (!cacheKey) {
      return
    }

    // 初始化时从缓存中获取数据
    const cacheData = _getCache(cacheKey)

    if (cacheData && 'data' in cacheData) {
      instance.state.data = cacheData.data
      instance.state.params = cacheData.params
      if (
        staleTime === -1 ||
        new Date().getTime() - cacheData.time <= staleTime
      ) {
        instance.state.loading = false
      }
    }

    // 订阅相同的cachekey更新，触发更新
    unSubscribe = subscribe(cacheKey, data => {
      instance.setState({ data })
    })
  }

  create()

  if (!cacheKey) {
    return {}
  }

  return {
    onBefore: params => {
      const cacheData = _getCache(cacheKey, params)
      if (!cacheData || !'data' in cacheData) {
        return {}
      }
      
      // 如果数据是新鲜的，停止请求
      if (
        staleTime === -1 ||
        new Date().getTime() - cacheData.time <= staleTime
      ) {
        return {
          loading: false,
          data: cacheData?.data,
          returnNow: true
        }
      } else {
        // 如果数据过时，则返回数据并继续请求
        return {
          data: cacheData?.data
        }
      }
    },
    onRequest: (service, args) => {
      let servicePromise = getCachePromise(cacheKey)

      if (servicePromise && servicePromise !== currentPromise) {
        return { servicePromise }
      }

      servicePromise = service(...args)

      currentPromise = servicePromise

      setCachePromise(cacheKey, servicePromise)

      return { servicePromise }
    },
    onSuccess: (data, params) => {
      if (cacheKey) {
        // 取消订阅，避免触发自我
        unSubscribe?.()
        _setCache(cacheKey, {
          data,
          params,
          time: new Date().getTime()
        })
        // 重新订阅
        unSubscribe = subscribe(cacheKey, d => {
          instance.setState({ data: d })
        })
      }
    },
    onMutate: data => {
      if (cacheKey) {
        // 取消订阅，避免触发自我
        unSubscribe?.()
        _setCache(cacheKey, {
          data,
          params: instance.state.params,
          time: new Date().getTime()
        })
        // 重新订阅
        unSubscribe = subscribe(cacheKey, d => {
          instance.setState({ data: d })
        })
      }
    }
  }
}

export default cachePlugin
