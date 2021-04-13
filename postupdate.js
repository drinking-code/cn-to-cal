const fs = require('fs');
const path = require('path');

(async () => {
    console.log()
    console.log('Retrieving your data...')

    if (!fs.existsSync('/tmp/cn-calendar-data.json')) {
        console.log('No data to retrieve.')
        process.exit(0)
    }

    const prefix = process.argv[2],
        dataPath = path.join(prefix, 'lib/node_modules/cn-calendar/credentials.json')

    await new Promise(resolve =>
        fs.copyFile('/tmp/cn-calendar-data.json', dataPath, () => resolve())
    )

    console.log('Retrieved data.')

    fs.rmSync('/tmp/cn-calendar-data.json')
})()
