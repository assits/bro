import throttle from 'lodash.throttle'

const throttlePlugin = (
  instance,
  { throttleWait, throttleLeading, throttleTrailing }
) => {
  let throttled = null

  const options = {}
  if (throttleLeading !== undefined) {
    options.leading = throttleLeading
  }
  if (throttleTrailing !== undefined) {
    options.trailing = throttleTrailing
  }

  if (throttleWait) {
    const _originRunAsync = instance.runAsync.bind(instance)

    throttled = throttle(
      callback => {
        callback()
      },
      throttleWait,
      options
    )

    instance.runAsync = (...args) => {
      return new Promise((resolve, reject) => {
        throttled(() => {
          _originRunAsync(...args)
            .then(resolve)
            .catch(reject)
        })
      })
    }
  } else {
    return {}
  }

  return {
    onCancel: () => {
      throttled.cancel()
    }
  }
}

export default throttlePlugin
