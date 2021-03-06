const { isCI } = require('ci-info')
const chalk = require('chalk')
const ora = require('ora')
const yn = require('yn')

function newLog () {
  const options = {
    verbose: false,
    interactive: false
  }

  const monoConsole = {
    log: (msg = '') => console.log(msg),
    verbose: msg =>
      options.verbose && useVerbose && console.log('[ VERBOSE ]', msg),
    success: msg => console.error('[ SUCCESS ]', msg),
    warn: msg => console.error('[ WARN ]', msg),
    error: msg => console.error('[ ERROR ]', msg),
    tip: msg => {}
  }

  const colorConsole = {
    log: (msg = '') => console.log(msg),
    verbose: msg => options.verbose && console.log(chalk.gray('verbose'), msg),
    success: msg => console.log(chalk.green('success'), msg),
    warn: msg => console.error(chalk.yellow.bold('warning'), msg),
    error: msg => console.error(chalk.bgRed(' ERROR '), msg),
    tip: msg => console.log(chalk.cyan.bold('+ TIP:'), msg)
  }

  const base = isCI ? monoConsole : colorConsole

  return {
    ...base,
    confirm: msg => {
      if (!options.interactive) {
        return Promise.resolve(true)
      }

      return new Promise((accept, reject) => {
        if (isCI) {
          reject(
            new Error(
              'Asking for confirmation messages is incompatible with CI'
            )
          )
          return
        }

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        })

        readline.question(`${msg} [Y/n] `, answer => {
          readline.close()
          accept(yn(answer, { default: true }))
        })
      })
    },
    options: {
      set verbose (value) {
        options.verbose = value
        base.verbose('Verbose mode enabled')
      },
      get verbose () {
        return options.verbose
      },

      set interactive (value) {
        options.interactive = value
        base.verbose(`Ineractive mode ${value ? 'enabled' : 'disabled'}`)
      },
      get interactive () {
        return options.interactive
      }
    }
  }
}

const spinners = []
const log = newLog()

function exit (err) {
  for (const spinner of spinners) {
    if (spinner.isSpinning) {
      spinner.stop()
    }
  }

  log.error(`Failed when executing command: ${chalk.bold(err.command)}`)

  if (err.code && err.code === 'ENOENT') {
    log.error(`Executable not found "${err.path}"`)
    process.exit(1)
  }

  throw err
}

function exitAll (err) {
  for (const spinner of spinners) {
    if (spinner.isSpinning) {
      spinner.stop()
    }
  }

  log.error('Something unexpected happened')
  log.log('')
  log.error(err)
  log.log('')
  log.log(
    'Please open an issue in https://github.com/kth/echolocation/issues/new and attach the information above'
  )
  process.exit(1)
}

/** Returns a new "ora" instance */
function newOra (msg) {
  const s = ora(msg)

  spinners.push(s)

  return s
}

module.exports = {
  log,
  exit,
  exitAll,
  ora: newOra
}
