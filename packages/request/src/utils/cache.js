class ItemCache {
  constructor(data, timeout) {
    this.data = data
    // 设定超时时间，设定为多少秒
    this.timeout = timeout
    // 创建对象时候的时间，大约设定为数据获得的时间
    this.cacheTime = new Date().getTime()
  }
}

class ExpriesCache {
  constructor(opts = {}) {
    this.cacheMax = opts.maxCache || 100
    this.timeout = opts.cacheTime || 60 * 1000
    this.cacheMap = new Map()
  }

  // 数据是否超时
  isOverTime(name) {
    const data = this.cacheMap.get(name)
    // 没有数据 一定超时
    if (!data) return true
    // 获取系统当前时间戳
    const currentTime = new Date().getTime()
    // 获取当前时间与存储时间的过去的秒数
    const overTime = currentTime - data.cacheTime
    // 如果过去的秒数大于当前的超时时间，也返回null让其去服务端取数据
    if (Math.abs(overTime) > data.timeout) {
      // 此代码可以没有，不会出现问题，但是如果有此代码，再次进入该方法就可以减少判断。
      this.remove(name)
      return true
    }
    // 不超时
    return false
  }

  // 当前data在 cache 中是否超时
  has(name) {
    return !this.isOverTime(name)
  }

  // 删除 cache 中的 data
  remove(name) {
    return this.cacheMap.delete(name)
  }

  // 清除所有cache
  clear() {
    this.cacheMap.clear()
  }

  // 获取
  get(name) {
    const isDataOverTiem = this.isOverTime(name)
    //如果 数据超时，返回null，但是没有超时，返回数据，而不是 ItemCache 对象
    return isDataOverTiem ? null : this.cacheMap.get(name).data
  }

  // 设置 缓存
  set(name, data, timeout = this.timeout) {
    // 设置缓存内容
    const itemCache = new ItemCache(data, timeout)
    //LRU 缓存淘汰策略---最近最少使用
    if (this.get(name)) {
      this.remove(name)
      this.cacheMap.set(name, itemCache)
    } else {
      this.cacheMap.set(name, itemCache)
      if (this.cacheMap.size > this.cacheMax) {
        const key = [...this.cacheMap][0][0]
        this.remove(key)
      }
    }
  }
}

export { ExpriesCache }
