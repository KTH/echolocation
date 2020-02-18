const resolveCwd = require('resolve-cwd')
const prettyBytes = require('pretty-bytes')
const path = require('path')
const { ora, log, exitAll, exit } = require('./utils/cli')
const docker = require('./utils/docker')
const tempy = require('tempy')
const fs = require('fs-extra')
const { gitignore } = require('globby')
const { compile } = require('handlebars')
const chalk = require('chalk')

const BASE_IMAGE = 'kthse/nodejs-echo'

async function showInfo () {
  const spinner = ora('Getting docker version').start()
  const dockerVersion = await docker.getVersion().catch(exit)
  const projectName = require(resolveCwd('./package.json')).name

  spinner.stop()

  log.success('Getting environment information')
  log.log(`Docker version:     ${dockerVersion}`)
  log.log(`Project name:       ${projectName} (from package.json)`)
}

async function copyRepo (src, dest) {
  const isIgnored = await gitignore({ cwd: src })

  return fs.copy(src, dest, {
    filter: (s, d) => {
      if (s === src) {
        return true
      }

      if (s.includes('.git/')) {
        return false
      }

      return !isIgnored(s)
    }
  })
}

function getNodeVersion () {
  const p = require(resolveCwd('./package.json'))
  return (p && p.engine && p.engine.node) || '12'
}

async function buildImage () {
  const version = getNodeVersion()
  const dockerfileProd = compile(
    fs.readFileSync(path.join(__dirname, './app-prod/Dockerfile.handlebars'), {
      encoding: 'utf-8'
    })
  )
  const dockerfileDev = compile(
    fs.readFileSync(path.join(__dirname, './app-dev/Dockerfile.handlebars'), {
      encoding: 'utf-8'
    })
  )

  const dir = tempy.directory()

  spinner = ora('Copying project to temp. directory').start()
  await copyRepo(process.cwd(), dir)

  spinner.text = 'Generating Dockerfile for production'
  await fs.writeFile(
    path.join(dir, 'Dockerfile'),
    dockerfileProd({ baseImage: `${BASE_IMAGE}:${version}` })
  )

  spinner.text = 'Building Docker image'
  const imageIdProd = await docker.buildImage(dir).catch(exit)

  spinner.text = 'Generating Dockerfile for development'
  await fs.writeFile(
    path.join(dir, 'Dockerfile'),
    dockerfileDev({ baseImage: `${BASE_IMAGE}:${version}` })
  )

  spinner.text = 'Building Docker image for development'
  const imageIdDev = await docker.buildImage(dir).catch(exit)

  spinner.text = 'Removing temp directory'
  await fs.remove(dir)

  spinner.text = 'Getting Image information'
  const nodeVersion = await docker.run(imageIdProd, 'node -v').catch(exit)
  const npmVersion = await docker.run(imageIdProd, 'npm -v').catch(exit)
  const dockerImageSize = await docker.getImageSize(imageIdProd).catch(exit)

  spinner.stop()

  log.success('Docker image correctly built')
  log.log(`Node.js version: ${nodeVersion}`)
  log.log(`npm version:     ${npmVersion}`)
  log.log(`Docker image (prod) ID: ${imageIdProd}`)
  log.log(`Docker image (dev) ID : ${imageIdDev}`)
  log.log(
    `Docker image size (prod): ${prettyBytes(parseInt(dockerImageSize, 10))}`
  )
  log.tip(`Run the image with \`docker run ${imageIdProd} --env-file .env\``)

  return {
    imageIdProd,
    imageIdDev
  }
}

async function runUnitTest (imageId) {
  const spinner = ora('Running unit test').start()

  try {
    await docker.run(imageId, 'npm test').catch(exit)
  } catch (err) {
    log.log(err.stdout)
    log.log(err.stderr)
    log.log('')
    log.error('Unit test failed. See results above')
    log.tip(`Fix the tests by using \`npm test\` (it is probably faster than this tool)`)
    log.tip(`Worked? Then try \`docker run ${imageId} npm test\``)
    log.log('')

    spinner.stop()
    process.exit()
  }

  spinner.stop()
  log.success('Unit test run succesfully')
}

async function tagImage (imageId) {
  const projectName = require(resolveCwd('./package.json')).name
  const tags = []
  tags.push(`${projectName}:latest`)

  if (process.env.GIT_LOCAL_BRANCH) {
    tags.push(`${projectName}:latest-${process.env.GIT_LOCAL_BRANCH}`)
  }

  if (process.env.BUILD_NUMBER) {
    tags.push(`${projectName}:${process.env.BUILD_NUMBER}`)
  }

  const spinner = ora('Tagging docker image').start()

  for (const tag of tags) {
    spinner.text = `Tagging docker image: "${tag}"`
    await docker.tagImage(imageId, tag)
  }
  spinner.stop()

  log.success('Docker image tagged successfully')
  for (const tag of tags) {
    log.log(`Image is tagged as "${tag}"`)
  }

  for (const tag of tags) {
    log.tip(`Run the image with \`docker run ${tag} --env-file .env\``)
  }

}

async function generateDockerfile () {
  const version = getNodeVersion()
  const overwriteDockerfile = fs.existsSync(path.join(process.cwd(), './Dockerfile'))
  const overwriteDockerignore = fs.existsSync(path.join(process.cwd(), './.dockerignore'))

  const dockerfileProd = compile(
    fs.readFileSync(path.join(__dirname, './app-prod/Dockerfile.handlebars'), {
      encoding: 'utf-8'
    })
  )

  spinner = ora('Generating Dockerfile').start()

  await fs.writeFile(
    path.join(process.cwd(), './Dockerfile'),
    dockerfileProd({ baseImage: `${BASE_IMAGE}:${version}` })
  )

  await fs.writeFile(path.join(process.cwd(), './.dockerignore'), '')

  await fs.appendFile(
    resolveCwd('./.dockerignore'),
    '*.git\n'
  )

  await fs.appendFile(
    resolveCwd('./.dockerignore'),
    fs.readFileSync(resolveCwd('./.gitignore'), { encoding: 'utf-8' })
  )

  spinner.stop()

  if (overwriteDockerfile) {
    log.warn(`Overwritten ${chalk.bold('Dockerfile')} with the one used to build the image`)
  } else {
    log.success(`Generated ${chalk.bold('Dockerfile')} used to build the image`)
  }

  if (overwriteDockerignore) {
    log.warn(`Overwritten ${chalk.bold('.dockerignore')} with the one used to build the image`)
  } else {
    log.success(`Generated ${chalk.bold('.dockerignore')} used to build the image`)
  }

  log.tip(`Reproduce the Docker build yourself: \`docker build .\``)
}

module.exports = {
  command: 'app',
  desc: 'Build the Node.js app in the current directory',
  builder: yargs =>
    yargs.option('gen', {
      describe: 'Generate Dockerfile and dockerignore files',
      type: 'boolean'
    }),
  async handler (argv) {
    try {
      await showInfo()
      console.log()

      const { imageIdDev, imageIdProd } = await buildImage()
      console.log()

      await runUnitTest(imageIdDev)
      console.log()

      await tagImage(imageIdProd)
      console.log()

      if (argv.gen) {
        await generateDockerfile()
        console.log()
      }
    } catch (err) {
      exitAll(err)
    }
  }
}
