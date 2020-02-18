#!/usr/bin/env node
require('dotenv').config()

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .commandDir('commands')
  .demandCommand()
  .help().argv
