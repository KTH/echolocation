const path = require('path')

function resolveCwd (...pathSegments) {
  return path.resolve(process.cwd(), ...pathSegments)
}

module.exports = {
  resolveCwd
}
