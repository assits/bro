// 增强器

import Fetch from './Fetch'

function requestEnhancer(adapter, options = {}, plugins = []) {
  const { manual = false, ...rest } = options

  const fetchOptions = {
    manual,
    ...rest
  }

  const initState = plugins.map(p => p?.onInit?.(fetchOptions)).filter(Boolean)

  const fetchInstance = new Fetch(
    adapter,
    fetchOptions,
    Object.assign({}, ...initState)
  )

  fetchInstance.options = options

  fetchInstance.plugins = plugins.map(p => p(fetchInstance, fetchOptions))

  return {
    // loading: fetchInstance.state.loading,
    // data: fetchInstance.state.data,
    // error: fetchInstance.state.error,
    // params: fetchInstance.state.params || [],
    cancel: fetchInstance.cancel.bind(fetchInstance),
    refresh: fetchInstance.refresh.bind(fetchInstance),
    refreshAsync: fetchInstance.refreshAsync.bind(fetchInstance),
    run: fetchInstance.run.bind(fetchInstance),
    runAsync: fetchInstance.runAsync.bind(fetchInstance),
    mutate: fetchInstance.mutate.bind(fetchInstance),
    onSuccess: fetchInstance.responseEvent.on,
    onError: fetchInstance.errorEvent.on,
    onFinally: fetchInstance.finallyEvent.on
  }
}

export default requestEnhancer
