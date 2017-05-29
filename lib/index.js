"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var events_1 = require("events");
var Client = require('ssh2-sftp-client');
var glob = require('glob');
var bluebird = require('bluebird');
var remoteShell = require('ssh-exec');
var localShell = require('node-cmd');
var upath = require('upath');
exports.EVENTS = {
    CmdStart: 'cmd:start',
    CmdEnd: 'cmd:end',
    CopyInit: 'copy:init',
    CopyProcess: 'copy:process',
    CopyEnd: 'copy:end',
    CommandsBefore: 'commands:before',
    CommandsAfter: 'commands:after'
};
var DeplyTool = (function (_super) {
    __extends(DeplyTool, _super);
    function DeplyTool(option) {
        var _this = _super.call(this) || this;
        _this.option = option;
        return _this;
    }
    DeplyTool.prototype.localRoot = function () {
        return this.option.localRoot;
    };
    DeplyTool.prototype.serverRoot = function () {
        return this.option.serverRoot;
    };
    DeplyTool.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sftp, localRoot_1, serverRoot_1, files_1, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.commandBefore()];
                    case 1:
                        _a.sent();
                        sftp = new Client();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, 6, 7]);
                        return [4 /*yield*/, sftp.connect({
                                host: this.option.host,
                                port: this.option.port || 22,
                                username: this.option.username,
                                password: this.option.password
                            })];
                    case 3:
                        _a.sent();
                        localRoot_1 = this.localRoot();
                        serverRoot_1 = this.serverRoot();
                        files_1 = glob.sync("**/*.*", {
                            cwd: localRoot_1
                        })
                            .filter(function (file) {
                            var stat = fs.statSync(path.join(localRoot_1, file));
                            return stat && stat.isFile();
                        });
                        this.emit(exports.EVENTS.CopyInit, files_1.length, serverRoot_1, localRoot_1);
                        return [4 /*yield*/, bluebird.mapSeries(files_1, function (file, index) { return __awaiter(_this, void 0, void 0, function () {
                                var from, to, dir;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.emit(exports.EVENTS.CopyProcess, file, index + 1, files_1.length);
                                            from = path.join(localRoot_1, file);
                                            to = path.join(serverRoot_1, file);
                                            dir = path.dirname(to);
                                            to = upath.toUnix(to);
                                            dir = upath.toUnix(dir);
                                            return [4 /*yield*/, sftp.mkdir(dir, true)];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, sftp.put(from, to)];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        err_1 = _a.sent();
                        throw err_1;
                    case 6:
                        sftp.end();
                        return [7 /*endfinally*/];
                    case 7:
                        this.emit(exports.EVENTS.CopyEnd);
                        return [4 /*yield*/, this.commandAfter()];
                    case 8:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DeplyTool.prototype.localFn = function (cmd) {
        var _this = this;
        return function () {
            return new Promise(function (resolve, reject) {
                var processRef = localShell.get(cmd, function (err, data, stderr) {
                    if (err) {
                        return reject(err);
                    }
                    if (stderr) {
                        return reject(stderr);
                    }
                    resolve();
                });
                _this.emit(exports.EVENTS.CmdStart, cmd, 'local', processRef.stdout);
            })
                .then(function () {
                _this.emit(exports.EVENTS.CmdEnd, cmd, 'local');
            });
        };
    };
    DeplyTool.prototype.remoteFn = function (cmd) {
        var _this = this;
        return function () {
            return new Promise(function (resolve, reject) {
                var pipe = remoteShell(cmd, {
                    user: _this.option.username,
                    host: _this.option.host,
                    password: _this.option.password
                });
                pipe.on('error', function (err) { return setTimeout(function () { return reject(err); }, 500); });
                pipe.on('finish', function () { return setTimeout(resolve, 500); });
                _this.emit(exports.EVENTS.CmdStart, cmd, 'remote', pipe);
            })
                .then(function () {
                _this.emit(exports.EVENTS.CmdEnd, cmd, 'remote');
            });
        };
    };
    DeplyTool.prototype.command = function (fn) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var rsu, call;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rsu = fn({
                            local: this.localFn.bind(this),
                            remote: this.remoteFn.bind(this)
                        });
                        call = function (cmdFunctions) { return __awaiter(_this, void 0, void 0, function () {
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, bluebird.mapSeries(cmdFunctions, function (fnItem) { return __awaiter(_this, void 0, void 0, function () {
                                            var r;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        r = fnItem();
                                                        return [4 /*yield*/, Promise.resolve(r)];
                                                    case 1:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        if (!Array.isArray(rsu)) return [3 /*break*/, 2];
                        return [4 /*yield*/, call(rsu)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        if (!(typeof rsu === 'function')) return [3 /*break*/, 4];
                        return [4 /*yield*/, call([rsu])];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DeplyTool.prototype.commandBefore = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.option.commands && this.option.commands.before && typeof this.option.commands.before === 'function')) return [3 /*break*/, 2];
                        this.emit(exports.EVENTS.CommandsBefore);
                        return [4 /*yield*/, this.command(this.option.commands.before.bind(this))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    DeplyTool.prototype.commandAfter = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.option.commands && this.option.commands.after && typeof this.option.commands.after === 'function')) return [3 /*break*/, 2];
                        this.emit(exports.EVENTS.CommandsAfter);
                        return [4 /*yield*/, this.command(this.option.commands.after.bind(this))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return DeplyTool;
}(events_1.EventEmitter));
exports.DeplyTool = DeplyTool;
