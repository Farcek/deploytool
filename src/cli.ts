#!/usr/bin/env node

import { DeplyTool, EVENTS } from './index';
import * as path from 'path';
import * as fs from 'fs';


const ProgressBar = require('progress');
const colors = require('colors');
const findRoot = require('find-root');
const argv = require('yargs')
  .usage('Usage: $0 [options]')

  .alias('c', 'config')
  .describe('c', 'configration file name')
  .help('h')
  .alias('h', 'help')
  .argv
  ;



const projectRoot = findRoot(process.cwd());
const configFile = ((argv) => {
  if (argv.config) {
    if (path.extname(argv.config)) return argv.config;
    return argv.config + ".js"
  }
  return 'deploy.js';
})(argv);

const configPath = path.resolve(projectRoot, configFile);

if (fs.existsSync(configPath)) {
  console.log()
  console.log(colors.grey('load>'), colors.green(configPath));
} else {
  console.log()
  console.log(colors.grey('load>'), colors.red('not found config'), colors.green(configPath))
  process.exit();
}


let options = require(configPath);



const dt = new DeplyTool(options);

var bar = null;

dt.on('cmd:start', (cmd, where, stream) => {
  console.log()
  console.log(colors.grey(where + '>'), colors.green(cmd))
  console.log(colors.grey('---------------------------------------------------------------------------'))
  stream && stream.pipe(process.stdout);
});

dt.on('cmd:end', (cmd) => {
  console.log('\n')
});

dt.on('copy:init', (total) => {
  console.log(colors.grey('copy >'), colors.green('total copy files:'), total)
  bar = new ProgressBar('copy [:bar] :percent :file', {
    total: total + 1, width: 15
  });
});

dt.on('copy:process', (file, index, total) => {
  bar && bar.tick({
    file
  });
});

dt.on('copy:end', () => {
  bar && bar.tick({
    file: ''
  });
});

console.time('run time')
dt.run()
  .then(() => {
    console.timeEnd('run time');
  })
  .catch((err: any) => {
    console.log('error', err)
  });


