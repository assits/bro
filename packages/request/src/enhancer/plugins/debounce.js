import debounce from 'lodash.debounce'

// 防抖
const debouncePlugin = (
  instance,
  { debounceWait, debounceLeading, debounceTrailing, debounceMaxWait }
) => {
  let debounced = null

  const options = {}
  if (debounceLeading !== undefined) {
    options.leading = debounceLeading
  }
  if (debounceTrailing !== undefined) {
    options.trailing = debounceTrailing
  }
  if (debounceMaxWait !== undefined) {
    options.maxWait = debounceMaxWait
  }

  if (debounceWait) {
    const _originRunAsync = instance.runAsync.bind(instance)

    debounced = debounce(
      callback => {
        callback()
      },
      debounceWait,
      options
    )

    instance.runAsync = (...args) => {
      return new Promise((resolve, reject) => {
        debounced(() => {
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
      debounced.cancel()
    }
  }
}

export default debouncePlugin
