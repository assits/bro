// 增强器

import { Fetch } from './Fetch'

export function createEnhancer(adapter, options = {}, plugins = []) {
  const { manual = false, ...rest } = options

  const fetchOptions = {
    manual,
    ...rest
  }

  const initState = plugins.map(p => p?.onInit?.(fetchOptions)).filter(Boolean)

  const fetchInstance = new Fetch(
    adapter,
    fetchOptions,
    null,
    Object.assign({}, ...initState)
  )

  fetchInstance.options = options

  fetchInstance.plugins = plugins.map(p => p(fetchInstance, fetchOptions))

  return {
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
