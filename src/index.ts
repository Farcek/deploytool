import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

import Client = require('ssh2-sftp-client');
import glob = require('glob');
import shell = require('shelljs');
import upath = require('upath');
import ssh2 = require('ssh2');
import { Writable, PassThrough } from 'stream';


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

    before?: (shell: IToolParam, runMode: string) => void;
    after?: (shell: IToolParam, runMode: string) => void;
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

                let to1 = upath.normalize(to);
                let dir1 = upath.normalize(dir);

                await sftp.mkdir(dir1, true);
                await sftp.put(from, to1);
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

    // private remoteCall(conn: ssh2.Client, outStream: Writable, cmd: string) {
    //     return new Promise((resolve, reject) => {
    //         outStream.write(`exec >> ${cmd}\n`);
    //         conn.exec(cmd, (err, stream) => {

    //             if (err) {
    //                 return reject(err);
    //             }

    //             stream.pipe(outStream, { end: false });
    //             stream.on('close', (code, signal) => {

    //                 if (code == 0) {
    //                     resolve()
    //                 } else {
    //                     reject(new Error(`exit code is "${code}". signal=${signal}. cmd = ${cmd}`))
    //                 }
    //             });
    //         });
    //     })
    // }

    // private async remoteLoop(conn: ssh2.Client, outStream: Writable, cmds: string[]) {
    //     for (let cmd of cmds) {
    //         await this.remoteCall(conn, outStream, cmd)
    //     }
    // }

    private remoteFn(cmds: string[]) {
        return new Promise((resolve, reject) => {
            var conn = new ssh2.Client();
            const outstream = new PassThrough();
            conn.on('ready', () => {
                let serverRoot = this.serverRoot();

                this.emit(EVENTS.CmdStart, cmds, 'remote', outstream);

                conn.shell((err, stream) => {

                    if (err) {
                        return reject(err);
                    }

                    stream.pipe(outstream, { end: false });
                    stream.on('close', (code, signal) => {

                        setTimeout(() => {
                            conn.end();
                            if (code == 0) {
                                resolve()
                            } else {
                                reject(new Error(`exit code is "${code}". signal=${signal}. cmd = ${cmds}`))
                            }
                        }, 200)
                    });
                    stream.write(`cd ${serverRoot}\n`);
                    for (let cmd of cmds) {
                        stream.write(`${cmd}\n`);
                    }
                    stream.end('exit\n');
                });
            });

            conn.on('error', reject);
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
            this.emit(EVENTS.CmdStart, cmds, 'local', stream);

            Promise.resolve()
                // .then(() => this.localCall(shell, stream, `cd ${localRoot}`))
                .then(() => this.localLoop(shell, stream, cmds))
                // .then(() => this.localCall(shell, stream, `exit`))
                .then(resolve)
                .catch(reject)
        })
            .then(() => {
                this.emit(EVENTS.CmdEnd, cmds, 'local');
            })
    }



    private async exec(command: (tool: IToolParam, runMode: string) => void) {
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

        command(shell, this.runMode);

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