export function createEventHook() {
  const fns = []

  const off = fn => {
    const index = fns.indexOf(fn)
    if (index !== -1) fns.splice(index, 1)
  }

  const on = fn => {
    fns.push(fn)

    return {
      off: () => off(fn)
    }
  }

  const trigger = (...args) => {
    fns.forEach(fn => fn(...args))
  }

  return {
    on,
    off,
    trigger
  }
}

export default class Fetch {
  // 请求时序
  count = 0

  state = {
    loading: false,
    params: undefined,
    data: undefined,
    error: undefined
  }

  plugins = []

  constructor(adapter, options = {}, setUpdate, initState = {}) {
    this.options = options
    this.adapter =
      adapter ||
      function adapter() {
        return Promise
      }

    if (initState) {
      this.state = {
        ...this.state,
        ...initState
      }
    }

    // 更新函数
    this.setUpdate = setUpdate || function () {}

    // 钩子函数
    this.responseEvent = createEventHook()
    this.errorEvent = createEventHook()
    this.finallyEvent = createEventHook()
  }

  setState(opts = {}) {
    this.state = {
      ...this.state,
      ...opts
    }
    this.setUpdate(this.state)
  }

  runPluginHandler(event, ...args) {
    const r = this.plugins.map(p => p[event]?.(...args)).filter(Boolean)
    return Object.assign({}, ...r)
  }

  refresh() {
    this.run(...(this.state.params || []))
  }

  refreshAsync() {
    return this.runAsync(...(this.state.params || []))
  }

  run(...params) {
    this.runAsync(...params).catch(error => {
      if (!this.options.onError) {
        console.error(error)
      }
    })
  }

  async runAsync(...params) {
    this.count += 1
    const currentCount = this.count

    const {
      stopNow = false,
      returnNow = false,
      ...state
    } = this.runPluginHandler('onBefore', params)

    // 是否停止请求
    if (stopNow) {
      return new Promise(() => {})
    }

    this.setState({
      loading: true,
      params,
      ...state
    })

    // 是否立刻返回
    if (returnNow) {
      return Promise.resolve(state.data)
    }

    this.options.onBefore?.(params)

    try {
      // 替换请求函数
      let { servicePromise } = this.runPluginHandler(
        'onRequest',
        this.adapter,
        params
      )

      if (!servicePromise) {
        servicePromise = this.adapter(...params)
      }

      const res = await servicePromise

      if (currentCount !== this.count) {
        return new Promise(() => {})
      }

      this.setState({
        data: res,
        error: undefined,
        loading: false
      })

      this.options.onSuccess?.(res, params)

      this.responseEvent.trigger(res, params)

      this.runPluginHandler('onSuccess', res, params)

      this.options.onFinally?.(params, res, undefined)

      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, res, undefined)
      }

      return res
    } catch (error) {
      if (currentCount !== this.count) {
        return new Promise(() => {})
      }

      this.setState({
        error,
        loading: false
      })

      this.options.onError?.(error, params)

      this.errorEvent.trigger(error, params)

      this.runPluginHandler('onError', error, params)

      this.options.onFinally?.(params, undefined, error)

      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, undefined, error)
      }

      throw error
    } finally {
      this.finallyEvent.trigger(null)
    }
  }

  cancel() {
    this.count += 1
    this.setState({
      loading: false
    })

    this.runPluginHandler('onCancel')
  }

  mutate(data) {
    let targetData
    if (typeof data === 'function') {
      targetData = data(this.state.data)
    } else {
      targetData = data
    }

    this.runPluginHandler('onMutate', targetData)

    this.setState({
      data: targetData
    })
  }
}
