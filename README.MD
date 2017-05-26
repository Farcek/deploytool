# deploytool

Node.js deploy tool

## install

```javascript
npm install deplytool

```

## usage

```javascript

deploytool --config deploy-config.js
// -- config default value deploy.js
// deploy.js location with package.json

```

## config

```javascript
// deploy-config.js

module.exports = {
    host: '',
    port: 22, // default 22
    username: '',
    password: '',
    serverRoot: '/foo/baar/server-path',
    localRoot:  __dirname +'/build',
    commands: {
        before: [function(tool) {
            var clearLocal = tool.local('rm -rf '+ __dirname +'/build' );
            var build = tool.local('npm build');
            var clearRemote = tool.remote('rm -rf /foo/baar/server-path');
            return tool.mapSeries([clearLocal,build,clearRemote] );
        }],
        after: [function(tool) {
            return tool.remote('pm2 reload all');
        }]
    }
};

// usage
// deploytool --config deploy-config.js

```