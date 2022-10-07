import { stringify } from 'qs'
import { ExpriesCache } from './cache'
import { PriorityQueue } from './priority-queue'

export class RequestThrottler {
  static pendingRequest = new Map()

  constructor(opts) {
    this.opts = opts
    // 并发限制
    this.limit = opts.limit || 5
    // 请求池
    this.pool = new PriorityQueue(opts)
    // 缓存池
    this.cache = new ExpriesCache(opts)
  }

  getCachedRequest(key) {
    const req = this.cache.get(key)
    if (req) {
      return req
    } else {
      this.cache.remove(key)
      return null
    }
  }

  setCachedRequest(key, data, timeout) {
    this.cache.set(key, data, timeout)
  }

  setPendingRequest(key, resolve, reject) {
    const list = this.pendingRequest.get(key) || []
    if (resolve) {
      list.push({ resolve, reject })
      this.pendingRequest.set(key, list)
    }
  }

  getPendingRequest(key) {
    return this.pendingRequest.get(key)
  }

  handleRequestByLimit(fn, priority) {
    this.pool.enqueue(fn, priority)

    const handle = async () => {
      while (this.limit > 0 && this.pool.count > 0) {
        this.limit--
        const p = this.pool.dequeue()
        console.log('--------', p.priority)
        p.value().finally(() => {
          this.limit++
          handle()
        })
      }
    }

    return Promise.resolve().then(handle)
  }

  async handleRequest(requestConf, adapter) {
    const { method, url, params, data } = requestConf || {}
    const key = [
      method,
      url,
      params && stringify(params),
      data && stringify(data)
    ]
      .filter(Boolean)
      .join('||')

    const { useCache = false, useCancelRepeat = false } = this.opts

    // 是否有缓存
    const cachedRequest = useCache && this.getCachedRequest(key)

    // 是否有相同的请求，正在请求中
    const pendingRequest = useCancelRepeat && this.getPendingRequest(key)

    if (cachedRequest) {
      return cachedRequest
    }

    if (pendingRequest) {
      return new Promise((resolve, reject) => {
        this.setPendingRequest(key, resolve, reject)
      })
    }

    const handleResolve = data => {
      if (pendingRequest) {
        pendingRequest.forEach(item => {
          item.resolve(data)
        })

        this.pendingRequest.delete(key)
      }

      if (useCache) {
        this.setCachedRequest(key, data)
      }
    }

    const handleReject = error => {
      if (pendingRequest) {
        pendingRequest.forEach(item => {
          item.reject(error)
        })

        this.pendingRequest.delete(key)
      }
    }

    return new Promise((resolve, reject) => {
      if (useCancelRepeat) {
        this.setPendingRequest(key, resolve, reject)
      }

      adapter(requestConf).then(handleResolve, handleReject)
    })
  }
}
