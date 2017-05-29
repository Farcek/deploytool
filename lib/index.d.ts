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
export interface IToolParam {
    local: (cmd: string) => Promise<void>;
    remote: (cmd: string) => Promise<void>;
}
export interface IOptions {
    host: string;
    port?: number;
    username: string;
    password: string;
    serverRoot: string;
    localRoot: string;
    commands?: {
        before?: (tool: IToolParam) => Function | Function[];
        after?: (tool: IToolParam) => Function | Function[];
    };
}
export declare class DeplyTool extends EventEmitter {
    private option;
    client: any;
    constructor(option: IOptions);
    localRoot(): string;
    serverRoot(): string;
    run(): Promise<void>;
    private localFn(cmd);
    private remoteFn(cmd);
    private command(fn);
    private commandBefore();
    private commandAfter();
}
