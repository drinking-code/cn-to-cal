#!/usr/bin/env node --no-warnings
const fs = require('fs')
const path = require("path");
const forever = require('forever')
const {confirm, prompt, stopRL} = require('./lib/prompt')

process.env.PROJECT_DIRECTORY = __dirname

// todo: make comments here

const args = [...process.argv]
args.shift()
args.shift()

const credentials_path = path.join(process.env.PROJECT_DIRECTORY, 'credentials.json')
const interval_path = path.join(process.env.PROJECT_DIRECTORY, 'lib', 'interval.js')
const index_path = path.join(process.env.PROJECT_DIRECTORY, 'lib', 'index.js')

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

forever.load({
    root: path.join(process.env.PROJECT_DIRECTORY, 'forever')
})

function isRunning() {
    return new Promise(resolve => {
        forever.list(false, (r, l) => {
            resolve(!!l)
        })
    })
}

(async () => {
    // alias 'run'
    if (!args[0] || args[0].startsWith('-'))
        args.unshift('run')

    switch (args[0]) {
        case 'setup': {
            const options = checkFlags('-y')

            let credentials = {
                icloud: {},
                campusnet: {}
            }

            if (fs.existsSync(credentials_path) && !options.includes('-y')) {
                if (await confirm(
                    'You have already run the setup. Running it again will overwrite the current setup.\nDo you want to continue?',
                    'Press [Y] to overwrite, or [N] to abort.',
                    false)) {
                    credentials = JSON.parse(fs.readFileSync(credentials_path, {encoding: 'utf8'}))
                    console.log('\nLeave any field blank to keep the previous value.')
                } else
                    process.exit(0)
            }

            // do the setup
            credentials.icloud.email = await prompt('icloud email: ') || credentials.icloud.email
            credentials.icloud.password = await prompt('icloud app-specific password: ', true) || credentials.icloud.password
            credentials.icloud.p = await prompt('two digits after p (http://pXX-...): ') || credentials.icloud.p
            credentials.icloud.DSid = await prompt('DSid: ', true) || credentials.icloud.DSid
            credentials.icloud.pGUID = await prompt('pGUID: ', true) || credentials.icloud.pGUID
            credentials.campusnet.email = await prompt('campusnet email: ') || credentials.campusnet.email
            credentials.campusnet.password = await prompt('campusnet password: ', true) || credentials.campusnet.password

            fs.writeFileSync(credentials_path, JSON.stringify(credentials), {encoding: 'utf8'})
            break
        }
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
                    false)
                )
                    process.exit(0)
                else
                    forever.stopAll()
            }
            if (options.includes('--once')) {
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
        case 'log': {
            checkFlags()
            forever.list(false, (n, a) => {
                a.forEach(process => {
                    console.log(fs.readFileSync(process.logFile, {encoding: 'utf8'}))
                })
            })
            break
        }
        default:
            // error unknown command
            console.error(`Unknown command: '${args[0]}'`)
    }

    stopRL()
})()
