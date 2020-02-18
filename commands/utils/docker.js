const fs = require('fs')
const execa = require('execa')
/**
 * Wrapper around Docker commands
 */

/** Returns the Docker version */
async function getVersion () {
  const { stdout } = await execa.command(
    'docker version --format {{.Server.Version}}'
  )

  return stdout
}

/** Build a docker image */
async function buildImage (dockerContext) {
  const iidPath = '/tmp/iid'

  await execa.command(
    `docker image build --iidfile ${iidPath} ${dockerContext}`
  )

  const imageId = fs.readFileSync(iidPath, { encoding: 'utf-8' })
  fs.unlinkSync(iidPath)

  return imageId
}

async function getImageSize (imageId) {
  const { stdout } = await execa.command(
    `docker image inspect ${imageId} --format={{.Size}}`
  )

  return stdout
}

async function run (imageId, command) {
  const { stdout } = await execa.command(`docker run ${imageId} ${command}`)

  return stdout
}

async function tagImage (imageId, tag) {
  await execa.command(`docker image tag ${imageId} ${tag}`)
}

async function push (tag) {
  await execa.command(`docker push ${tag}`)
}

module.exports = {
  getVersion,
  getImageSize,
  buildImage,
  tagImage,
  push,
  run
}
