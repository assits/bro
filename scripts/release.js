const { join } = require('path')
const {
  yParser,
  execa,
  chalk,
  fsExtra: { writeFileSync }
} = require('@bomijs/utils')
const exec = require('./utils/exec')
const getPackages = require('./utils/getPackages')
const isNextVersion = require('./utils/isNextVersion')
const { getChangelog } = require('./utils/changelog')

const cwd = process.cwd()
const args = yParser(process.argv.slice(2))
const lernaCli = require.resolve('lerna/cli')

function printErrorAndExit(message) {
  console.error(chalk.red(message))
  process.exit(1)
}

function logStep(name) {
  console.log(`${chalk.gray('>> Release:')} ${chalk.magenta.bold(name)}`)
}

async function release() {
  // Check git status
  if (!args.skipGitStatusCheck) {
    const gitStatus = execa.sync('git', ['status', '--porcelain']).stdout
    if (gitStatus.length) {
      printErrorAndExit(`Your git status is not clean. Aborting.`)
    }
  } else {
    logStep(
      'git status check is skipped, since --skip-git-status-check is supplied'
    )
  }

  // get release notes
  logStep('get release notes')
  const releaseNotes = await getChangelog()
  console.log(releaseNotes(''))

  // Check npm registry
  logStep('check npm registry')
  const userRegistry = execa.sync('npm', ['config', 'get', 'registry']).stdout
  if (userRegistry.includes('https://registry.yarnpkg.com/')) {
    printErrorAndExit(
      `Release failed, please use ${chalk.blue('npm run release')}.`
    )
  }
  if (!userRegistry.includes('https://registry.npmjs.org/')) {
    const registry = chalk.blue('https://registry.npmjs.org/')
    printErrorAndExit(`Release failed, npm registry must be ${registry}.`)
  }

  let updated = null

  // Get updated packages
  logStep('check updated packages')
  const updatedStdout = execa.sync(lernaCli, ['changed']).stdout
  updated = updatedStdout
    .split('\n')
    .map(pkg => {
      return pkg.split('/')[1]
    })
    .filter(Boolean)
  if (!updated.length) {
    printErrorAndExit('Release failed, no updated package is updated.')
  }

  if (!args.publishOnly) {
    // Clean
    logStep('clean')

    // Build
    if (!args.skipBuild) {
      logStep('build')
      await exec('npm', ['run', 'build'])
    } else {
      logStep('build is skipped, since args.skipBuild is supplied')
    }

    // Bump version
    logStep('bump version with lerna version')
    await exec(lernaCli, [
      'version',
      '--exact',
      '--no-commit-hooks',
      '--no-git-tag-version',
      '--no-push'
    ])

    // Push
    logStep(`git push`)
    await exec('git', ['push', 'origin', 'master']).catch(err =>
      console.error(err)
    )
  }

  // Publish
  const pkgs = updated
  logStep(`publish packages: ${chalk.blue(pkgs.join(', '))}`)
  pkgs
    .sort(a => {
      return a === 'assits' ? 1 : -1
    })
    .forEach((pkg, index) => {
      const pkgPath = join(cwd, 'packages', pkg)
      const { name } = require(join(pkgPath, 'package.json'))
      console.log(`[${index + 1}/${pkgs.length}] Publish package ${name}`)
      const cliArgs = ['publish']
      const { stdout } = execa.sync('npm', cliArgs, {
        cwd: pkgPath
      })
      console.log(stdout)
    })

  logStep('done')
}

release().catch(err => {
  console.error(err)
  process.exit(1)
})
