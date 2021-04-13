const fs = require('fs');
const path = require('path');
const {exec, spawn} = require('child_process');

(async () => {
    console.log('Stashing your config data...')

    const prefix = (await new Promise(resolve =>
            exec('npm config -g get prefix', (error, stdout) => {
                if (stdout)
                    resolve(stdout.replace(/\n/g, ''))
            })
        )).toString(),
        dataPath = path.join(prefix, 'lib/node_modules/cn-calendar/credentials.json')

    await new Promise(resolve =>
        fs.copyFile(dataPath, '/tmp/cn-calendar-data.json', () => resolve())
    )

    console.log('Updating...')
    const npm = (process.platform === "win32" ? "npm.cmd" : "npm")
    const updateProcess = spawn(npm, ['i', '-g', 'drinking-code/campusnet-feed-test'], {stdio: 'inherit'})
    updateProcess.on('close', () => {
        spawn('node', [`${prefix}/lib/node_modules/cn-calendar/postupdate.js`, prefix], {stdio: 'inherit'})
    })
})()
