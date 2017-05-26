import * as path from 'path';
import { EventEmitter } from 'events';

const Client = require('ssh2-sftp-client');
const glob = require('glob');
const mapSeries = require('promise-map-series');
const remoteShell = require('ssh-exec');
const localShell = require('node-cmd');


export const EVENTS = {
    CmdStart: 'cmd:start',
    CmdEnd: 'cmd:end',
    CopyInit: 'copy:init',
    CopyProcess: 'copy:process',
    CopyEnd: 'copy:end',
    CommandsBefore: 'commands:before',
    CommandsAfter: 'commands:after'
}

export interface IOptions {
    host: string
    port?: number
    username: string
    password: string
    serverRoot: string
    localRoot: string
    commands?: {
        [key: string]: Function[]
    }
}
export class DeplyTool extends EventEmitter {
    client: any
    constructor(private option: IOptions) {
        super();
    }

    async run() {
        await this.commands('before');

        let sftp = new Client();
        await sftp.connect({
            host: this.option.host,
            port: this.option.port || 22,
            username: this.option.username,
            password: this.option.password
        });

        let localRoot = this.option.localRoot;
        let serverRoot = this.option.serverRoot;

        let files: string[] = glob.sync(`**/*.*`, {
            cwd: localRoot
        });

        this.emit(EVENTS.CopyInit, files.length);
        await mapSeries(files, async (file: string, index: number) => {
            this.emit(EVENTS.CopyProcess, file, index + 1, files.length)
            await sftp.put(path.join(localRoot, file), path.join(serverRoot, file));
        });


        sftp.end();
        this.emit(EVENTS.CopyEnd);

        await this.commands('after');
    }

    async commands(name: string) {

        if (this.option.commands && name in this.option.commands && Array.isArray(this.option.commands[name])) {
            this.emit('commands:' + name, this.option.commands[name].length);
            await mapSeries(this.option.commands[name], async (it: Function) => {
                await this.command(it);
            });
        }
    }

    async command(cmdItem: Function) {
        return await cmdItem({
            local: (cmd) => {
                return new Promise((resolve, reject) => {
                    var processRef = localShell.get(cmd, (err, data, stderr) => {
                        if (err) {
                            return reject(err);
                        }
                        if (stderr) {
                            return reject(err);
                        }
                        resolve(data);
                    });
                    this.emit(EVENTS.CmdStart, cmd, 'local', processRef.stdout);

                })
                    .then(rsu => {
                        this.emit(EVENTS.CmdEnd, cmd, 'local');
                        return rsu;
                    })
            },
            remote: (cmd) => {

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
                    .then(rsu => {
                        this.emit(EVENTS.CmdEnd, cmd, 'local');
                        return rsu;
                    })
            },
            mapSeries
        });
    }
}

