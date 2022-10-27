// 1. 支持请求拦截、响应拦截
// 2. 支持中间件
// 3. 支持自定义适配器模式，内置 Fetch、Axios
// 4. 支持美化响应结果

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

export default createIntance()
