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
var events_1 = require("events");
var Client = require('ssh2-sftp-client');
var glob = require('glob');
var mapSeries = require('promise-map-series');
var remoteShell = require('ssh-exec');
var localShell = require('node-cmd');
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
    DeplyTool.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sftp, localRoot, serverRoot, files;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.commands('before')];
                    case 1:
                        _a.sent();
                        sftp = new Client();
                        return [4 /*yield*/, sftp.connect({
                                host: this.option.host,
                                port: this.option.port || 22,
                                username: this.option.username,
                                password: this.option.password
                            })];
                    case 2:
                        _a.sent();
                        localRoot = this.option.localRoot;
                        serverRoot = this.option.serverRoot;
                        files = glob.sync("**/*.*", {
                            cwd: localRoot
                        });
                        this.emit(exports.EVENTS.CopyInit, files.length);
                        return [4 /*yield*/, mapSeries(files, function (file, index) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.emit(exports.EVENTS.CopyProcess, file, index + 1, files.length);
                                            return [4 /*yield*/, sftp.put(path.join(localRoot, file), path.join(serverRoot, file))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 3:
                        _a.sent();
                        sftp.end();
                        this.emit(exports.EVENTS.CopyEnd);
                        return [4 /*yield*/, this.commands('after')];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DeplyTool.prototype.commands = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.option.commands && name in this.option.commands && Array.isArray(this.option.commands[name]))) return [3 /*break*/, 2];
                        this.emit('commands:' + name, this.option.commands[name].length);
                        return [4 /*yield*/, mapSeries(this.option.commands[name], function (it) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.command(it)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    DeplyTool.prototype.command = function (cmdItem) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, cmdItem({
                            local: function (cmd) {
                                return new Promise(function (resolve, reject) {
                                    var processRef = localShell.get(cmd, function (err, data, stderr) {
                                        if (err) {
                                            return reject(err);
                                        }
                                        if (stderr) {
                                            return reject(err);
                                        }
                                        resolve(data);
                                    });
                                    _this.emit(exports.EVENTS.CmdStart, cmd, 'local', processRef.stdout);
                                })
                                    .then(function (rsu) {
                                    _this.emit(exports.EVENTS.CmdEnd, cmd, 'local');
                                    return rsu;
                                });
                            },
                            remote: function (cmd) {
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
                                    .then(function (rsu) {
                                    _this.emit(exports.EVENTS.CmdEnd, cmd, 'local');
                                    return rsu;
                                });
                            },
                            mapSeries: mapSeries
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return DeplyTool;
}(events_1.EventEmitter));
exports.DeplyTool = DeplyTool;
