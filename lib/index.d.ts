/// <reference types="node" />
import { EventEmitter } from 'events';
export declare const EVENTS: {
    CmdStart: string;
    CmdEnd: string;
    CopyInit: string;
    CopyProcess: string;
    CopyEnd: string;
    CommandsBefore: string;
    CommandsAfter: string;
};
export interface IOptions {
    host: string;
    port?: number;
    username: string;
    password: string;
    serverRoot: string;
    localRoot: string;
    commands?: {
        [key: string]: Function[];
    };
}
export declare class DeplyTool extends EventEmitter {
    private option;
    client: any;
    constructor(option: IOptions);
    run(): Promise<void>;
    commands(name: string): Promise<void>;
    command(cmdItem: Function): Promise<any>;
}
