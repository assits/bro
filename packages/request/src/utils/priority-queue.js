// 优先级队列
export class PriorityQueue {
  constructor(compare) {
    if (typeof compare !== 'function') {
      throw new Error('compare function required!')
    }

    this.queue = []
    this.compare = compare
  }
  //二分查找 寻找插入位置
  search(target) {
    let low = 0,
      high = this.queue.length
    while (low < high) {
      let mid = low + ((high - low) >> 1)
      if (this.compare(this.queue[mid], target) > 0) {
        high = mid
      } else {
        low = mid + 1
      }
    }
    return low
  }
  //添加
  push(elem) {
    let index = this.search(elem)
    this.queue.splice(index, 0, elem)
    return this.queue.length
  }
  //取出最优元素
  pop() {
    return this.queue.pop()
  }
  //查看最优元素
  peek() {
    return this.queue[this.queue.length - 1]
  }
}
