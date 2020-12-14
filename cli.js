#!/usr/bin/env node
const fs = require('fs')
const readlineSync = require('readline-sync');
const readline = require('readline')
const path = require("path");

const args = [...process.argv]
args.shift()
args.shift()

const credentials_path = path.join(process.mainModule.path, 'credentials.json')

const checkFlags = (...flags) => {
    let options = [...args]
    options.shift()
    let foundFlags = []
    options.forEach(arg => {
        if (flags.indexOf(arg) === -1) {
            console.error(`Unknown option: '${arg}'`)
            process.exit(22)
        } else
            foundFlags.push(arg)
    })
    return foundFlags
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
process.stdin.setRawMode(false);

(async () => {
    switch (args[0]) {
        case 'setup': {
            const options = checkFlags('-y')

            function confirm(message, def) {
                return new Promise(r => {
                    let data = `${message} [${(def === null || def === undefined) ? 'y/n' : (def ? 'Y/n' : 'N/y')}]: `;
                    rl.write(data)
                    readline.emitKeypressEvents(process.stdin);
                    process.stdin.setRawMode(true);
                    process.stdin.on('keypress', (str, key) => {
                        process.stdin.setRawMode(false);
                        rl.write('\n')
                        switch (key.name) {
                            case 'y':
                                return r(true)
                            case 'n':
                                return r(false)
                            case 'return':
                                return r(def)
                            default: {
                                rl.write('Press [Y] to overwrite, or [N] to abort. ')
                                process.stdin.setRawMode(true);
                            }
                        }
                    });
                })
            }

            if (fs.existsSync(credentials_path) && !options.includes('-y')) {
                if (await confirm('You have already run the setup. Running it again will overwrite the current setup.\nDo you want to continue?', false))
                    console.log('\nLeave any field blank to keep the previous value.')
                else
                    process.exit(0)
            }
            // do the setup
            let credentials = {
                icloud: {},
                campusnet: {},
            }
            credentials.icloud.email = readlineSync.question('icloud email: ') || credentials.icloud.email
            credentials.icloud.password = readlineSync.question('icloud app-specific password: ', {
                hideEchoBack: true
            }) || credentials.icloud.password
            credentials.icloud.p = readlineSync.question('two digits after p (http://pXX-...): ') || credentials.icloud.p
            credentials.icloud.DSid = readlineSync.question('DSid: ') || credentials.icloud.DSid
            credentials.icloud.pGUID = readlineSync.question('pGUID: ') || credentials.icloud.pGUID
            credentials.campusnet.email = readlineSync.question('campusnet email: ') || credentials.campusnet.email
            credentials.campusnet.password = readlineSync.question('campusnet password: ', {
                hideEchoBack: true
            }) || credentials.campusnet.password
            fs.writeFileSync(credentials_path, JSON.stringify(credentials), {encoding: 'utf8'})
            break
        }
        case undefined:
        // alias 'run'
        case 'run': {
            const options = checkFlags('-q', '--quiet', '--once')
            // check if setup has been done
            if (!fs.existsSync(credentials_path)) {
                console.error('You must run `cn-calendar setup` before usage.\n' +
                    'Please follow the instructions at https://github.com/drinking-code/cn-to-cal#setup')
                process.exit(2)
            }
            // start background process
            break
        }
        case 'stop': {
            const options = checkFlags()
            // stop background process
            break
        }
        default:
        // error unknown command
    }
})()
