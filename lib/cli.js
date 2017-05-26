#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var path = require("path");
var fs = require("fs");
var ProgressBar = require('progress');
var colors = require('colors');
var findRoot = require('find-root');
var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .alias('c', 'config')
    .describe('c', 'configration file name')
    .help('h')
    .alias('h', 'help')
    .argv;
var projectRoot = findRoot(process.cwd());
var configFile = (function (argv) {
    if (argv.config) {
        if (path.extname(argv.config))
            return argv.config;
        return argv.config + ".js";
    }
    return 'deploy.js';
})(argv);
var configPath = path.resolve(projectRoot, configFile);
if (fs.existsSync(configPath)) {
    console.log();
    console.log(colors.grey('load>'), colors.green(configPath));
}
else {
    console.log();
    console.log(colors.grey('load>'), colors.red('not found config'), colors.green(configPath));
    process.exit();
}
var options = require(configPath);
var dt = new index_1.DeplyTool(options);
var bar = null;
dt.on('cmd:start', function (cmd, where, stream) {
    console.log();
    console.log(colors.grey(where + '>'), colors.green(cmd));
    stream && stream.pipe(process.stdout);
});
dt.on('cmd:end', function (cmd) {
    console.log('\n');
});
dt.on('copy:init', function (total) {
    console.log(colors.grey('copy >'), colors.green('total copy files:'), total);
    bar = new ProgressBar('copy [:bar] :percent :file', {
        total: total + 1, width: 15
    });
});
dt.on('copy:process', function (file, index, total) {
    bar && bar.tick({
        file: file
    });
});
dt.on('copy:end', function () {
    bar && bar.tick({
        file: ''
    });
});
dt.run()
    .then(function () {
    console.log('success done');
})
    .catch(function (err) {
    console.log('error', err);
});
