const { isCI } = require('ci-info')
const chalk = require('chalk')
const ora = require('ora')

const monoConsole = {
  log: msg => console.log(msg),
  success: msg => console.error('[ SUCCESS ]', msg),
  warn: msg => console.error('[ WARN ]', msg),
  error: msg => console.error('[ ERROR ]', msg),
  tip: msg => {}
}

const colorConsole = {
  log: msg => console.log(msg),
  success: msg => console.log(chalk.green('success'), msg),
  warn: msg => console.error(chalk.yellow.bold('warning'), msg),
  error: msg => console.error(chalk.bgRed(' ERROR '), msg),
  tip: msg => console.log(chalk.cyan.bold('+ TIP:'), msg)
}

const log = isCI ? monoConsole : colorConsole
const spinners = []

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
    'Please open an issue in https://github.com/kth/eevoo/issues/new and attach the information above'
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
