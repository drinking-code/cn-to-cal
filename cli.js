#!/usr/bin/env node --no-warnings
const fs = require('fs')
const readline = require('readline')
const path = require("path");
const forever = require('forever')
const promptly = require('promptly')

const args = [...process.argv]
args.shift()
args.shift()

const credentials_path = path.join(process.mainModule.path, 'credentials.json')
const interval_path = path.join(process.mainModule.path, 'lib', 'interval.js')
const index_path = path.join(process.mainModule.path, 'lib', 'index.js')

const checkFlags = (...flags) => {
    let options = [...args]
    if (!options[0].startsWith('-'))
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

forever.load({
    root: path.join(process.mainModule.path, 'forever')
})

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/*function confirm(message, failMsg, def) {

    return new Promise(r => {
        let data = `${message}${message.endsWith(' ') ? '' : ' '}[${
            (def === null || def === undefined) ? 'y/n' :
                (def ? 'Y/n' : 'N/y')
        }]: `;
        rl.write(data)
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        const kpHandler = (str, key) => {
            process.stdin.removeAllListeners()
            process.stdin.setRawMode(false);
            process.stdin.resume()
            rl.write('\n')
            rl.resume()
            switch (key.name) {
                case 'y':
                    return r(true)
                case 'n':
                    return r(false)
                case 'return':
                    return r(def)
                default:
                    process.stdin.on('keypress', kpHandler)
                    rl.write(failMsg + (failMsg.endsWith(' ') ? '' : ' '))
            }
        }
        process.stdin.on('keypress', kpHandler)
    })
}*/

function confirm(message, failMsg, def) {
    return new Promise(r => {
        let data = `${message}${message.endsWith(' ') ? '' : ' '}[${
            (def === null || def === undefined) ? 'y/n' :
                (def ? 'Y/n' : 'N/y')
        }]: `;
        // rl.write(data)

        const kpHandler = (s, key) => {
            process.stdin.removeListener('keypress', kpHandler)
            rl.resume()
            switch (key.name) {
                case 'y':
                    return r(true)
                case 'n':
                    return r(false)
                case 'return':
                    return r(def)
                default:
                    rl.write(failMsg + (failMsg.endsWith(' ') ? '' : ' '))
                    rl.resume()
                    process.stdin.on('keypress', kpHandler)
            }
        }
        process.stdin.on('keypress', kpHandler)
    })
}

rl.question = (message, secret) => {
    return new Promise(r => {
        message = message + message.endsWith(' ') ? '' : ' ';
        if (!secret)
            rl.question(message, (answer) => {
                r(answer);
            })
        else {
            rl.write(message)
            let answer = '';
            const kpHandler = (s, key) => {
                if (key.name === 'return') {
                    process.stdin.removeListener('keypress', kpHandler)
                    rl.resume()
                    r(answer)
                } else
                    answer += s
            }
            process.stdin.on('keypress', kpHandler)
        }
    })
}

function isRunning() {
    return new Promise(resolve => {
        forever.list(false, (r, l) => {
            resolve(!!l)
        })
    })
}

(async () => {
    switch (args[0]) {
        case 'setup': {
            const options = checkFlags('-y')

            if (fs.existsSync(credentials_path) && !options.includes('-y')) {
                if (await confirm(
                    'You have already run the setup. Running it again will overwrite the current setup.\nDo you want to continue?',
                    'Press [Y] to overwrite, or [N] to abort.',
                    false))
                    console.log('\nLeave any field blank to keep the previous value.')
                else
                    process.exit(0)
            }
            // do the setup
            let credentials = JSON.parse(fs.writeFileSync(credentials_path, {encoding: 'utf8'}))

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
            const options = checkFlags('-q', '--quiet', '--once', '-y')
            // check if setup has been done
            if (!fs.existsSync(credentials_path)) {
                console.error('You must run `cn-calendar setup` before usage.\n' +
                    'Please follow the instructions at https://github.com/drinking-code/cn-to-cal#setup')
                process.exit(2)
            }
            if (await isRunning() && !options.includes('-y') && !options.includes('--once')) {
                if (!await confirm(
                    'The script is already running. Do you want to restart?',
                    'Press [Y] to restart, or [N] to abort.',
                    false))
                    process.exit(0)
            } else if (options.includes('--once')) {
                require('child_process').fork(index_path)
                    .on('exit', code => {
                        process.exit(code)
                    })
            } else {
                forever.cleanLogsSync()
                // start background process
                forever.startDaemon(interval_path);
                if (!options.includes('-q') && !options.includes('--quiet')) {
                    console.log('The script is now running.')
                    console.log('Run `cn-calendar stop` to stop it.')
                }
            }
            break
        }
        case 'stop': {
            checkFlags()
            // stop background process
            let stopEmitter = forever.stopAll()
            stopEmitter.on('error', err => {
                console.error('The script is already stopped.')
            })
            stopEmitter.on('stopAll', res => {
                console.log('Stopped the script successfully.')
            })
            break
        }
        case 'list': {
            forever.list(false, console.log)
            break
        }
        default:
            // error unknown command
            console.error(`Unknown command: '${args[0]}'`)
    }
})()
