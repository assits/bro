const { readdirSync } = require('fs')
const { join } = require('path')

const getPackage = dir => {
  return readdirSync(join(process.cwd(), dir))
    .filter(pkg => pkg.charAt(0) !== '.')
    .map(pkg => {
      return {
        dir,
        pkg
      }
    })
}

module.exports = function getPackages(dir) {
  if (!dir) throw new Error('Invalid field')
  if (Array.isArray(dir)) {
    return dir.reduce((memo, e) => {
      const packages = getPackage(e)
      return memo.concat(packages)
    }, [])
  }
  return getPackage(dir)
}
