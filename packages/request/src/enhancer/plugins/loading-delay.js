// 延迟 loading

const loadingDelayPlugin = (instance, { loadingDelay }) => {
  let timer = null

  if (!loadingDelay) {
    return {}
  }

  const cancelTimeout = () => {
    if (timer) {
      clearTimeout(timer)
    }
  }

  return {
    onBefore: () => {
      cancelTimeout()

      timer = setTimeout(() => {
        instance.setState({
          loading: true
        })
      }, loadingDelay)

      return {
        loading: false
      }
    },
    onFinally: () => {
      cancelTimeout()
    },
    onCancel: () => {
      cancelTimeout()
    }
  }
}

export default loadingDelayPlugin
