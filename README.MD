# deploytool

Node.js deploy tool

## install

```javascript
npm install deploy-tool

```

## usage

```javascript

deploy-tool --config deploy-config.js
// -- config default value deploy.js
// deploy.js location with package.json

```

## config

```javascript
// deploy-config.js

var serverRoot = '/foo/baar/server-path';
var localRoot = __dirname +'/build';


module.exports = {
    host: '',
    port: 22, // default 22
    username: '',
    password: '',
    serverRoot: serverRoot,
    localRoot:  localRoot,
    patterns: [ // gulp patterns
        'config/production/**/*.*', 'config/index.js',
        'core/package.json', 'core/build/**/*.*',
        'web/package.json', 'web/dist/**/*.*',
        'pm2.eco.json'
    ],
    commands: {
        before: function(tool) {
            var clearLocal = tool.local('rm -rf '+ __dirname +'/build' );
            var build = tool.local('npm build');
            var clearRemote = tool.remote('rm -rf /foo/baar/server-path');
            return [clearLocal,build,clearRemote] ;
        },
        after: function(tool) {
            var cd = "cd "+ serverRoot + ' && ';
            var npm = tool.remote(cd+' npm install');
            var reload = tool.remote(cd+ 'pm2 reload all');
            return [npm,reload]
        }
    }
};

// usage
// deploy-tool --config deploy-config.js

```