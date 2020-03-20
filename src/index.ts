import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

import Client = require('ssh2-sftp-client');
import glob = require('glob');
import shell = require('shelljs');
import upath = require('upath');
import ssh2 = require('ssh2');

const { PassThrough, Writable } = require('stream');

export const EVENTS = {
    CmdStart: 'cmd:start',
    CmdEnd: 'cmd:end',
    CopyInit: 'copy:init',
    CopyProcess: 'copy:process',
    CopyEnd: 'copy:end',
    CommandsBefore: 'commands:before',
    CommandsAfter: 'commands:after'
}

export interface IShellItem {
    (cmd: string[]): IToolParam
}



export interface IToolParam {
    local: IShellItem;
    remote: IShellItem;
}



export interface IOptions {

    // ssh2 connection config. 
    connection: ssh2.ConnectConfig;
    serverRoot: string
    localRoot: string

    // gulp pattern
    patterns?: string | string[];

    before?: (tool: IToolParam) => void;
    after?: (tool: IToolParam) => void;
}
export class DeplyTool extends EventEmitter {
    constructor(private option: IOptions, private runMode: string) {
        super();
    }

    localRoot() {
        return path.resolve(this.option.localRoot)
    }
    serverRoot() {
        return this.option.serverRoot
    }
    patterns(): string[] {
        return Array.isArray(this.option.patterns) ? this.option.patterns : (this.option.patterns ? [this.option.patterns] : ['**/*.*'])
    }
    async run() {
        await this.commandBefore();
        await this.upload();
        await this.commandAfter();
    }

    private async upload() {
        let sftp = new Client();
        try {
            await sftp.connect(this.option.connection);


            let localRoot = this.localRoot();
            let serverRoot = this.serverRoot();

            let files: string[] = [];

            for (var p of this.patterns()) {
                let _files = glob.sync(p, {
                    cwd: localRoot
                })
                    .filter(file => {
                        var stat = fs.statSync(path.join(localRoot, file));
                        return stat && stat.isFile();
                    });
                files = files.concat(_files);
            }

            this.emit(EVENTS.CopyInit, files.length, serverRoot, localRoot);

            let i = 0;
            for (let file of files) {
                this.emit(EVENTS.CopyProcess, file, ++i, files.length);

                let from = path.join(localRoot, file);
                let to = path.join(serverRoot, file);

                let dir = path.dirname(to);

                to = upath.toUnix(to);
                dir = upath.toUnix(dir);

                await sftp.mkdir(dir, true);
                await sftp.put(from, to);
            }
        }
        catch (err) {
            throw err;
        }
        finally {
            sftp.end();
        }



        this.emit(EVENTS.CopyEnd);
    }

    private remoteCall(conn: ssh2.Client, outStream: any, cmd: string) {
        return new Promise((resolve, reject) => {
            conn.exec(cmd, (err, stream) => {

                if (err) {
                    return reject(err);
                }

                // stream.pipe(outStream)
                stream.on('close', (code, signal) => {
                    if (code == 0) {
                        resolve()
                    } else {
                        reject(new Error(`exit code is "${code}". cmd = ${cmd}`))
                    }
                });
                stream.stderr.on('data', (a) => console.log('stream.stderr.data', a.toString()))
                stream.on('data', (data) => outStream.write(data));
                stream.on('error', (err) => reject(err));
            });
        })
    }

    private async remoteLoop(conn: ssh2.Client, outStream: any, cmds: string[]) {
        for (let cmd of cmds) {
            await this.remoteCall(conn, outStream, cmd)
        }
    }

    private remoteFn(cmds: string[]) {
        return new Promise((resolve, reject) => {
            var conn = new ssh2.Client();
            conn.on('ready', () => {
                let serverRoot = this.serverRoot();
                const outstream = new PassThrough();
                this.emit(EVENTS.CmdStart, cmds, 'remote', outstream);

                Promise.resolve()
                    .then(() => this.remoteCall(conn, outstream, `cd ${serverRoot}`))
                    .then(() => this.remoteLoop(conn, outstream, cmds))
                    .then(() => this.remoteCall(conn, outstream, `exit`))
                    .then(resolve)
                    .catch(reject)
                    .then(() => conn.end())
                    ;

            });

            conn.connect(this.option.connection);
        })
            .then(() => {
                this.emit(EVENTS.CmdEnd, cmds, 'remote');
            })
    }

    private localCall(shell: any, outStream: any, cmd: string) {
        return new Promise((resolve, reject) => {
            const child = shell.exec(cmd, { async: true, silent: true }, (code, stdout, stderr) => {
                if (code == 0) {
                    resolve();
                } else {
                    reject(new Error(`exit code "${code}". cmd= ${cmd}`))
                }
            });

            child.stdout.on('data', (data) => outStream.write(data));
            child.stderr.on('data', (data) => outStream.write(data));
        });
    }

    private async localLoop(shell: any, outStream: any, cmds: string[]) {
        for (let cmd of cmds) {
            await this.localCall(shell, outStream, cmd)
        }
    }
    private localFn(cmds: string[]) {
        return new Promise((resolve, reject) => {
            const localRoot = this.localRoot();

            const stream = new PassThrough();
            this.emit(EVENTS.CmdStart, cmds[0], 'local', stream);

            Promise.resolve()
                .then(() => this.localCall(shell, stream, `cd ${localRoot}`))

                .then(() => this.localLoop(shell, stream, cmds))
                .then(() => this.localCall(shell, stream, `exit`))




        })
            .then(() => {
                this.emit(EVENTS.CmdEnd, cmds, 'local');
            })
    }



    private async exec(command: (tool: IToolParam) => void) {
        const commands: Array<() => Promise<void>> = [];
        const shell: IToolParam = {
            local: (cmd: string | string[]) => {
                commands.push(async () => {
                    await this.localFn(Array.isArray(cmd) ? cmd : [cmd]);
                });
                return shell;
            },
            remote: (cmd: string | string[]) => {
                commands.push(async () => {
                    await this.remoteFn(Array.isArray(cmd) ? cmd : [cmd]);
                });
                return shell;
            }
        };

        command(shell);

        for (let cmd of commands) {
            await cmd();
        }
    }

    private async commandBefore() {
        if (this.option.before && typeof this.option.before === 'function') {
            this.emit(EVENTS.CommandsBefore);
            await this.exec(this.option.before);
        }
    }

    private async commandAfter() {
        if (this.option.after && typeof this.option.after === 'function') {
            this.emit(EVENTS.CommandsAfter);
            await this.exec(this.option.after);
        }
    }
}

let s: IOptions = {

    // ssh2 connection config. 
    connection: {
        host: '119.40.96.80',
        port: 22,
        username: 'node8',
        password: 'ftP0$$'
    },
    serverRoot: '/home/node8/ttest',
    localRoot: __dirname,
    patterns: '**/*',

    before: (tool) => {
        // tool.local('ls -la')
        // tool.local('node -v')
        tool.remote(['node -v'])
        tool.remote(['ls -xq d -dada'])
    }
}