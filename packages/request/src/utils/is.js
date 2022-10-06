export const ToStringTypes = {
  String: 'String',
  Number: 'Number',
  Boolean: 'Boolean',
  RegExp: 'RegExp',
  Null: 'Null',
  Undefined: 'Undefined',
  Symbol: 'Symbol',
  Object: 'Object',
  Array: 'Array',
  process: 'process',
  Window: 'Window',
  Function: 'Function',
  Date: 'Date',
  Blob: 'Blob',
  ArrayBuffer: 'ArrayBuffer',
  File: 'File',
  FileList: 'FileList',
  URLSearchParams: 'URLSearchParams'
}

export const nativeToString = Object.prototype.toString

export function isType(type) {
  return function (value) {
    return nativeToString.call(value) === `[object ${type}]`
  }
}

export const isNumber = isType(ToStringTypes.Number)

export const isString = isType(ToStringTypes.String)

export const isBoolean = isType(ToStringTypes.Boolean)

export const isNull = isType(ToStringTypes.Null)

export const isUndefined = isType(ToStringTypes.Undefined)

export const isSymbol = isType(ToStringTypes.Symbol)

export const isFunction = isType(ToStringTypes.Function)

export const isObject = isType(ToStringTypes.Object)

export const isArray = isType(ToStringTypes.Array)

export const isDate = isType(ToStringTypes.Date)

export const isProcess = isType(ToStringTypes.process)

export const isWindow = isType(ToStringTypes.Window)

export const isBlob = isType(ToStringTypes.Blob)

export const isArrayBuffer = isType(ToStringTypes.ArrayBuffer)

export const isFile = isType(ToStringTypes.File)

export const isFileList = isType(ToStringTypes.FileList)

export const isURLSearchParams = isType(ToStringTypes.URLSearchParams)

export const isStream = val => isObject(val) && isFunction(val.pipe)

export const isFormData = val => {
  const pattern = '[object FormData]'
  return (
    val &&
    ((typeof FormData === 'function' && val instanceof FormData) ||
      toString.call(val) === pattern ||
      (isFunction(val.toString) && val.toString() === pattern))
  )
}

export function isError(wat) {
  switch (nativeToString.call(wat)) {
    case '[object Error]':
      return true
    case '[object Exception]':
      return true
    case '[object DOMException]':
      return true
    default:
      return isInstanceOf(wat, Error)
  }
}

/**
 * 检查是否是空对象
 *
 * @export
 * @param {Object} obj 待检测的对象
 * @return {*}  {boolean}
 */
export function isEmptyObject(obj) {
  return isObject(obj) && Object.keys(obj).length === 0
}

/**
 * 检测是否是空字符、undefined、null
 *
 * @export
 * @param {*} wat
 * @return {*}  {boolean}
 */
export function isEmpty(wat) {
  return (
    (isString(wat) && wat.trim() === '') || wat === undefined || wat === null
  )
}

export function isInstanceOf(wat, base) {
  try {
    return wat instanceof base
  } catch (_e) {
    return false
  }
}

export function isExistProperty(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function isBuffer(val) {
  return (
    val !== null &&
    !isUndefined(val) &&
    val.constructor !== null &&
    !isUndefined(val.constructor) &&
    isFunction(val.constructor.isBuffer) &&
    val.constructor.isBuffer(val)
  )
}

export const isPlainObject = val => {
  if (!isObject(val)) {
    return false
  }

  const prototype = Object.getPrototypeOf(val)
  return prototype === null || prototype === Object.prototype
}
