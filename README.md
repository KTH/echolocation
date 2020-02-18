# echolocation

**EXPERIMENTAL**. No-install, no-configuration. The glue between Node.js and Docker

## No-features

- No installation. Just run with `npx`.
- No configuration files. Just follow _well-known_ conventions
- No Docker-related files needed
- No CI-related files needed

## Usage

The `@kth/echolocation` CLI is available via npm and can be run with `npx` or installed globally:

```sh
# Run with npx
npx @kth/echolocation «command»

# Install globally and run
npm install -g @kth/echolocation
@kth/echolocation «command»
```

We recommend you to **NOT** install this tool locally in your projects

---

# Commands

1. **app**. Build the Node.js app in the current directory and create a Docker image from it
2. **node**. Build a custom-made Node.js image

## 1. `npx @kth/echolocation app`

> Note: your project will be based on a special Node.js image called `kthse/nodejs-echo`. Right now, it is not published and you need to have to generate the image and have it locally. See the command `npx @kth/echolocation node` below to do it.

Build the Node.js app in the current directory

```sh
npx @kth/echolocation app
```

### Options

- `--gen`. Generates `Dockerfile` and `.dockerignore` files in the current directory that was used to build the image.

  Note: it overwrites existing files.

## 2. `npx @kth/echolocation node`

Builds a custom Node.js 12 Docker image based on `kth-os`

```sh
npx @kth/echolocation node
```
