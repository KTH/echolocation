# eevo

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

# Commands

- **app**. Build the Node.js app in the current directory and create a Docker image from it
- **node**. Build a custom-made Node.js image

## `npx @kth/eevoo app`. Build the Node.js app in the current directory

```sh
npx @kth/echolocation app
```

## Options

- `--gen`. Generates `Dockerfile` and `.dockerignore` files in the current directory that was used to build the image.

  Note: it overwrites existing files.

### `node`

Builds a custom Node.js 12 Docker image based on `kth-os`

```sh
npx @kth/eevo node
```
