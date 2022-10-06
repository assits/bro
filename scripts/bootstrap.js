const { join } = require('path')
const {
  yParser,
  fsExtra: { existsSync, writeFileSync }
} = require('@bomijs/utils')
const getPackages = require('./utils/getPackages')

;(async () => {
  const args = yParser(process.argv)
  const version = require('../lerna.json').version

  const pkgs = getPackages(['packages'])

  pkgs.forEach(({ dir, pkg: shortName }) => {
    const name = `@assits/${shortName}`

    const pkgJSONPath = join(process.cwd(), dir, shortName, 'package.json')
    const pkgJSONExists = existsSync(pkgJSONPath)
    if (args.force || !pkgJSONExists) {
      const json = {
        name,
        version,
        description: name,
        main: 'lib/index.js',
        files: ['lib', 'dist/', 'es'],
        keywords: ['@assits'],
        authors: ['sport'],
        license: 'MIT',
        publishConfig: {
          access: 'public'
        }
      }
      if (pkgJSONExists) {
        const pkg = require(pkgJSONPath)
        ;[
          'dependencies',
          'devDependencies',
          'peerDependencies',
          'bin',
          'files',
          'authors',
          'types',
          'sideEffects',
          'main',
          'module'
        ].forEach(key => {
          if (pkg[key]) json[key] = pkg[key]
        })
      }
      writeFileSync(pkgJSONPath, `${JSON.stringify(json, null, 2)}\n`)
    }

    const readmePath = join(process.cwd(), dir, shortName, 'README.md')
    if (args.force || !existsSync(readmePath)) {
      writeFileSync(readmePath, `# ${name}\n`)
    }
  })
})()
