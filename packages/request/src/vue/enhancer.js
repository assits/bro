// 增强器
import {
  shallowRef,
  reactive,
  toRefs,
  computed,
  onMounted,
  onUnmounted,
  isRef
} from 'vue-demi'
import { Fetch } from '../enhancer'

export function createEnhancer(service, options = {}, plugins = []) {
  // 读取配置
  const { manual = false, ready = true, ...rest } = options

  const fetchOptions = {
    manual,
    ready,
    ...rest
  }

  // 定义一个serviceRef
  const serviceRef = shallowRef(service)

  // 存储state的响应式对象
  const state = reactive({
    data: undefined,
    loading: false,
    params: undefined,
    error: undefined
  })

  const setUpdate = (s, field) => {
    if (field) {
      state[field] = s
    } else {
      state.data = s.data
      state.loading = s.loading
      state.error = s.error
      state.params = s.params
    }
  }

  // fetch的实例化
  const fetchInstance = computed(() => {
    // 获取初始化initState
    const initState = plugins
      .map(p => p?.onInit?.(fetchOptions))
      .filter(Boolean)
    return new Fetch(
      serviceRef.value,
      fetchOptions,
      setUpdate,
      Object.assign({}, ...initState)
    )
  })

  fetchInstance.value.options = fetchOptions

  // 运行插件
  fetchInstance.value.plugins = plugins.map(p => {
    return p(fetchInstance.value, fetchOptions)
  })

  // manual控制是否自动发送请求
  onMounted(() => {
    if (!manual) {
      const params =
        fetchInstance.value.state.params || options.defaultParams || []
      if (isRef(ready) ? ready.value : ready) fetchInstance.value.run(...params)
    }
  })

  // 组件卸载的时候取消请求
  onUnmounted(() => {
    fetchInstance.value.cancel()
  })

  return {
    ...toRefs(state),
    cancel: fetchInstance.value.cancel.bind(fetchInstance.value),
    refresh: fetchInstance.value.refresh.bind(fetchInstance.value),
    refreshAsync: fetchInstance.value.refreshAsync.bind(fetchInstance.value),
    run: fetchInstance.value.run.bind(fetchInstance.value),
    runAsync: fetchInstance.value.runAsync.bind(fetchInstance.value),
    mutate: fetchInstance.value.mutate.bind(fetchInstance.value),
    onSuccess: fetchInstance.value.responseEvent.on,
    onError: fetchInstance.value.errorEvent.on,
    onFinally: fetchInstance.value.finallyEvent.on
  }
}
