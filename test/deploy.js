module.exports = {

    // ssh2 connection config. 
    connection: {
        host: '119.40.96.80',
        port: 22,
        username: 'node8',
        password: 'ftP0$$'
    },
    serverRoot: '/home/node8/ttest',
    localRoot: __dirname,
    patterns: '**/*',

    before: (tool) => {
        // tool.local('ls -la')
        tool.remote('npm -v')
        tool.remote([
            'node -v',
            'ls',
            'cd ..',
            'ls',
            'll',
        ])

        tool.remote('ls -xq d -dada')
    }
}