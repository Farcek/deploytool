# deploytool

Node.js deploy tool.

- sftp upload to remoting server
- upload before commands
- upload after commands

## install

```javascript
npm install deploy-tool

```

## usage

```javascript

deploy-tool --config deploy-config.js
// or
deploy --config deploy-config.js --mode=install

// --config :
// --mode : runing mode pass to config. 
//          default value "update".


```

## config

```javascript
// deploy-config.js

module.exports = {
    // ssh2 connection config. 
    // https://www.npmjs.com/package/ssh2
    connection: {
        host: 'xxx',
        port: 22,
        username: 'xxx',
        password: 'xxx',
        // privateKey: require('fs').readFileSync('/here/is/my/key')
        // passphrase : 'xxx'
    },

    serverRoot: '/home/node8/app-root',
    localRoot: __dirname,

    // upload files. gulp pattern
    patterns: [
        'lib/**/*',
        'dist/**/*',
        'package.json',        
        'pm2.eco.json'
        // more files
    ],

    // uploading before. commands
    before: (shell, mode) => {
        shell.local('npm version patch');

        if(mode == 'install') {
            shell.remote('mkdir -p /home/node8/app-root');
        }
        if(mode == 'update') {
            shell.remote([
                'rm -rf /home/node8/app-root/lib/*.*',
                'rm -rf /home/node8/app-root/dist/*.*',
            ]);
        }

        /** it is working  **/
        // shell.remote([
        //     'echo $(pwd)',
        //     'cd ..',
        //     'echo $(pwd)',
        // ]);

        // shell.remote('npm -v')
        // shell.remote('node -v')
        // shell.local('npm -v')
        // shell.local('node -v')
        // shell.local('echo foo bar')
    },

    // uploading after. commands
    after: (shell, mode) => {
        shell.remote('npm i --production');
        shell.remote('npm run db:up');
        shell.local('pm2 reload all')

        // !!!!!  local shell "cd" not run.  not use "cd"
        // tool.local('echo %cd%')
        // tool.local('cd ..')
        // tool.local('echo %cd%')
    }
};
```