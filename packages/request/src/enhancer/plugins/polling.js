import { isFunction } from '../../utils'

// 轮询
const pollingPlugin = (
  instance,
  { pollingCount = 0, pollingInterval = 500, pollingCondition }
) => {
  let timer = null
  let count = 0
  const stopPolling = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    onBefore: () => {
      stopPolling()
    },
    onFinally: () => {
      if (isFunction(pollingCondition) && pollingCondition() === false) {
        return
      }
      if (!pollingCount || pollingCount <= count) {
        count = 0
        return
      }

      timer = setTimeout(() => {
        ++count
        instance.refresh()
      }, pollingInterval)
    },
    onCancel: () => {
      stopPolling()
    }
  }
}

export default pollingPlugin
