#!/usr/bin/env node

import { DeplyTool, EVENTS } from './index';
import * as path from 'path';
import * as fs from 'fs';

const ProgressBar = require('progress');
const colors = require('colors');


var ArgumentParser = require('argparse').ArgumentParser;
var parser = new ArgumentParser({
  addHelp: true,
  description: 'deployment tool.  files update. remote shell. local shell.'
});
parser.addArgument(
  '--config',
  {
    required: true,
    help: 'configure file path'
  }
);
parser.addArgument(
  '--mode',
  {
    help: 'runing mode param',
    defaultValue: 'update'
  }
);

const args = parser.parseArgs();


const configPath = path.resolve(args.config);

if (fs.existsSync(configPath)) {
  console.log()
  console.log(colors.grey('load>'), colors.green(configPath));
} else {
  console.log()
  console.log(colors.grey('load>'), colors.red('not found config'), colors.green(configPath))
  process.exit();
}


const options = require(configPath);
const dt = new DeplyTool(options, args.mode);

const $ = { bar: null };

dt.on(EVENTS.CmdStart, (cmd, where, stream) => {
  console.log()
  console.log(colors.grey(where + '>'), colors.green(cmd))
  console.log(colors.grey('---------------------------------------------------------------------------'))
  // stream && stream.pipe(process.stdout);
  stream && stream.on('data', data => console.log(data.toString()));
});

dt.on(EVENTS.CmdEnd, (cmd) => {
  console.log('\n')
  console.log('\n')
});

dt.on(EVENTS.CopyInit, (total) => {
  console.log(colors.grey('copy >'), colors.green('total copy files:'), total)
  $.bar = new ProgressBar('copy [:bar] :percent :file', {
    total: total + 1, width: 15
  });
});

dt.on(EVENTS.CopyProcess, (file, index, total) => {
  $.bar && $.bar.tick({
    file
  });
});

dt.on(EVENTS.CopyEnd, () => {
  $.bar && $.bar.tick({
    file: ''
  });
});

console.time('run time')
dt.run()
  .then(() => {
    console.timeEnd('run time');
  })
  .catch((err: any) => {
    console.log(colors.red(' ----- Error ----'))
    console.log(err)
  });


