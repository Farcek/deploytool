import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

const Client = require('ssh2-sftp-client');
const glob = require('glob');
const bluebird = require('bluebird');
const remoteShell = require('ssh-exec');
const localShell = require('node-cmd');
const upath = require('upath');



export const EVENTS = {
    CmdStart: 'cmd:start',
    CmdEnd: 'cmd:end',
    CopyInit: 'copy:init',
    CopyProcess: 'copy:process',
    CopyEnd: 'copy:end',
    CommandsBefore: 'commands:before',
    CommandsAfter: 'commands:after'
}

export interface IToolParam {
    local: (cmd: string) => Promise<void>
    remote: (cmd: string) => Promise<void>
}
export interface IOptions {
    host: string
    port?: number
    username: string
    password: string
    serverRoot: string
    localRoot: string
    commands?: {
        before?: (tool: IToolParam) => Function | Function[]
        after?: (tool: IToolParam) => Function | Function[]
    }
}
export class DeplyTool extends EventEmitter {
    client: any
    constructor(private option: IOptions) {
        super();
    }

    localRoot() {
        return this.option.localRoot
    }
    serverRoot() {
        return this.option.serverRoot
    }
    async run() {
        await this.commandBefore();

        let sftp = new Client();

        try {
            await sftp.connect({
                host: this.option.host,
                port: this.option.port || 22,
                username: this.option.username,
                password: this.option.password
            });

            let localRoot = this.localRoot();
            let serverRoot = this.serverRoot();

            let files: string[] = glob.sync(`**/*.*`, {
                cwd: localRoot
            })
                .filter(file => {
                    var stat = fs.statSync(path.join(localRoot, file));
                    return stat && stat.isFile();
                })
                ;

            this.emit(EVENTS.CopyInit, files.length, serverRoot, localRoot);


            await bluebird.mapSeries(files, async (file: string, index: number) => {
                this.emit(EVENTS.CopyProcess, file, index + 1, files.length)

                var from = path.join(localRoot, file);
                var to = path.join(serverRoot, file);

                var dir = path.dirname(to);

                to = upath.toUnix(to);
                dir = upath.toUnix(dir);

                await sftp.mkdir(dir, true);
                await sftp.put(from, to);
            })

        }
        catch (err) {

            throw err;
        }
        finally {
            sftp.end();
        }



        this.emit(EVENTS.CopyEnd);

        await this.commandAfter();
    }



    private localFn(cmd: string) {
        return () => {
            return new Promise((resolve, reject) => {
                
                var processRef = localShell.get(cmd, (err, data, stderr) => {
                    if (err) {
                        return reject(err);
                    }
                    if (stderr) {
                        return reject(stderr);
                    }
                    resolve();
                });
                this.emit(EVENTS.CmdStart, cmd, 'local', processRef.stdout);
            })
                .then(() => {
                    this.emit(EVENTS.CmdEnd, cmd, 'local');
                })
        }
    }
    private remoteFn(cmd: string) {
        return () => {
            return new Promise((resolve, reject) => {
                var pipe = remoteShell(cmd, {
                    user: this.option.username,
                    host: this.option.host,
                    password: this.option.password
                });

                pipe.on('error', (err) => setTimeout(() => reject(err), 500));
                pipe.on('finish', () => setTimeout(resolve, 500));
                this.emit(EVENTS.CmdStart, cmd, 'remote', pipe);
            })
                .then(() => {
                    this.emit(EVENTS.CmdEnd, cmd, 'remote');
                })
        }
    }

    private async command(fn: Function) {
        var rsu = fn({
            local: this.localFn.bind(this),
            remote: this.remoteFn.bind(this)
        });

        var call = async (cmdFunctions: Function[]) => {
            await bluebird.mapSeries(cmdFunctions, async (fnItem) => {
                var r = fnItem();
                await Promise.resolve(r);
            });
        }
        if (Array.isArray(rsu)) {
            await call(rsu);
        } else if (typeof rsu === 'function') {
            await call([rsu]);
        }


    }
    private async commandBefore() {
        if (this.option.commands && this.option.commands.before && typeof this.option.commands.before === 'function') {
            this.emit(EVENTS.CommandsBefore);
            await this.command(this.option.commands.before.bind(this));

        }
    }

    private async commandAfter() {
        if (this.option.commands && this.option.commands.after && typeof this.option.commands.after === 'function') {
            this.emit(EVENTS.CommandsAfter);
            await this.command(this.option.commands.after.bind(this));
        }
    }
}

