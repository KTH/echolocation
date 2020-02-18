const docker = require('./utils/docker')
const { exit, log, ora, exitAll } = require('./utils/cli')
const prettyBytes = require('pretty-bytes')
const path = require('path')

const BASE_IMAGE = 'kthse/nodejs-echo'

async function showInfo () {
  const spinner = ora('Getting docker version').start()
  const dockerVersion = await docker.getVersion().catch(exit)

  spinner.stop()

  log.success('Getting environment information')
  log.log(`Docker version:     ${dockerVersion}`)
}

async function buildNode () {
  const context = path.join(__dirname, './node')

  const spinner = ora('Building the Docker image...').start()
  const imageId = await docker.buildImage(context)
  spinner.text = 'Getting image data...'

  const nodeVersion = await docker.run(imageId, 'node -v').catch(exit)
  const npmVersion = await docker.run(imageId, 'npm -v').catch(exit)

  const dockerImageSize = await docker.getImageSize(imageId).catch(exit)

  spinner.stop()
  log.success('Docker image built')
  log.log(`Node.js version:   ${nodeVersion}`)
  log.log(`npm version:       ${npmVersion}`)
  log.log(`Docker image ID:   ${imageId}`)
  log.log(`Docker image size: ${prettyBytes(parseInt(dockerImageSize, 10))}`)

  return imageId
}

async function tagImage (imageId) {
  const nodeVersion = await docker.run(imageId, 'node -v')
  const [major, minor, patch] = nodeVersion.split('.')

  const t1 = `${BASE_IMAGE}:${major.slice(1)}`
  const t2 = `${BASE_IMAGE}:${major.slice(1)}.${minor}`
  const t3 = `${BASE_IMAGE}:${major.slice(1)}.${minor}.${patch}`

  await docker.tagImage(imageId, t1)
  await docker.tagImage(imageId, t2)
  await docker.tagImage(imageId, t3)
  log.success('Docker image tagged successfully')
  log.log(`Image is tagged as "${t1}"`)
  log.log(`Image is tagged as "${t2}"`)
  log.log(`Image is tagged as "${t3}"`)

  return [t1, t2, t3]
}

async function pushTags (tags) {
  const spinner = ora('Pushing to Docker registry').start()
  for (const tag of tags) {
    spinner.text = `Pushing ${tag}`
    await docker.push(tag)
  }

  spinner.stop()
  log.success('Tags pushed to Docker')
  for (const tag of tags) {
    log.log(tag)
  }
}

module.exports = {
  command: 'node',
  desc: 'Build a Node.js base image',
  builder: yargs => yargs,
  async handler (argv) {
    try {
      await showInfo()
      console.log()

      const imageId = await buildNode()
      console.log()

      const tags = await tagImage(imageId)
      console.log()

      /*
      if (argv.push) {
        await pushTags(tags)
      }
      */
    } catch (err) {
      exitAll(err)
    }
  }
}
