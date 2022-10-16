import { isFunction } from '../../utils'

// 错误重试
const retryPlugin = (
  instance,
  { retryCount, retryInterval, retryCondition }
) => {
  let timer = null
  let count = 0
  let triggerByRetry = false

  const stopRetry = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  if (!retryCount) {
    return {}
  }

  return {
    onBefore: () => {
      if (!triggerByRetry) {
        count = 0
      }
      triggerByRetry = false

      stopRetry()
    },
    onSuccess: () => {
      count = 0
    },
    onError: err => {
      count += 1

      const condition = isFunction(retryCondition) ? retryCondition(err) : true

      if (condition && (retryCount === -1 || count <= retryCount)) {
        const timeout =
          retryInterval ?? Math.min(1000 * 2 ** count, 3 * 10 * 1000)
        timer = setTimeout(() => {
          triggerByRetry = true
          instance.refresh()
        }, timeout)
      } else {
        count = 0
      }
    },
    onCancel: () => {
      count = 0
      stopRetry()
    }
  }
}

export default retryPlugin
