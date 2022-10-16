// 数据加中心，需要解决的问题
// 1.单位时间内，并发相同的接口，如何取值
// 2.特殊接口，需要先完成后，其他接口才能执行，例如登录、刷新等接口
// 3.限制同时并发请求的个数，以一定的速率请求
// 4.

import Core from './Core'
import Onion from './Onion'
import { Cancel, CancelToken, isCancel } from '../cancel'

function createIntance(opts = {}) {
  const coreInstance = new Core(opts)

  const bomiIntance = (optionsOrUrl, options = {}) => {
    return coreInstance.request(optionsOrUrl, options)
  }

  // 拦截器
  bomiIntance.interceptors = coreInstance.interceptors

  // 中间件
  bomiIntance.use = coreInstance.use.bind(coreInstance)

  // 暴露各个实例的中间件
  bomiIntance.middlewares = {
    instance: coreInstance.onion.middlewares,
    defaultInstance: coreInstance.onion.defaultMiddlewares,
    global: Onion.globalMiddlewares,
    core: Onion.coreMiddlewares
  }

  bomiIntance.Cancel = Cancel
  bomiIntance.CancelToken = CancelToken
  bomiIntance.isCancel = isCancel

  // 请求语法糖： reguest.get request.post ……
  const METHODS = [
    'get',
    'post',
    'delete',
    'put',
    'patch',
    'head',
    'options',
    'rpc'
  ]
  METHODS.forEach(method => {
    bomiIntance[method] = (url, options) =>
      bomiIntance(url, { ...options, method })
  })

  return bomiIntance
}

/**
 * extend 用户可以定制配置.
 * initOpions 初始化参数
 * @param {number} maxCache 最大缓存数
 * @param {string} prefix url前缀
 * @param {function} errorHandler 统一错误处理方法
 * @param {object} headers 统一的headers
 */
export const extend = initOptions => createIntance(initOptions)

export const fetch = createIntance({ parseResponse: false })

export default createIntance()
