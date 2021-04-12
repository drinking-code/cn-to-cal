const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

(async () => {
    console.log('Retrieving your data.')

    if (!fs.existsSync('/tmp/cn-calendar-data.json'))
        console.log('No data to retrieve.')

    const prefix = await new Promise(resolve =>
            exec('npm config -g get prefix', (error, stdout) => {
                if (stdout)
                    resolve(stdout.replace(/\n/g, ''))
            })
        ),
        dataPath = path.join(prefix, 'lib/node_modules/cn-calendar/credentials.json')

    await new Promise(resolve =>
        fs.copyFile('/tmp/cn-calendar-data.json', dataPath, () => resolve())
    )

    console.log('Retrieved data.')

    fs.rmSync('/tmp/cn-calendar-data.json')
})()
