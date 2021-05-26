#!/usr/bin/env node --no-warnings
const fs = require('fs')
const path = require("path");
const {confirm, prompt, stopRL} = require('./lib/prompt')
const {spawn, fork} = require('child_process')

process.env.PROJECT_DIRECTORY = __dirname

process.on('exit', () => stopRL.bind(null, {cleanup: true}));
process.on('SIGINT', () => stopRL.bind(null, {cleanup: true}));

// todo: make comments here

const args = [...process.argv]
args.shift()
args.shift()

const credentials_path = path.join(process.env.PROJECT_DIRECTORY, 'credentials.json')
const interval_path = path.join(process.env.PROJECT_DIRECTORY, 'lib', 'interval.js')
const index_path = path.join(process.env.PROJECT_DIRECTORY, 'lib', 'index.js')
const tmpPath = path.join(process.env.PROJECT_DIRECTORY, 'tmp')
const logPath = path.join(tmpPath, 'last.log')

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

function isRunning() {
    return !(
        !fs.existsSync(tmpPath)
        || fs.readdirSync(tmpPath).filter(file => file.endsWith('.pid')).length === 0
    )
}

const printVersion = () => {
    console.log('CampusNet to Calendar; version ' + require('./package.json').version)
}

const stopAll = () =>
    fs.readdirSync(tmpPath).forEach(pid => {
        if (!pid.endsWith('.pid')) return
        try {
            process.kill(
                Number(pid.replace('.pid', '')),
                'SIGINT'
            )
        } catch (e) {
        } finally {
            fs.rmSync(path.join(tmpPath, pid))
        }
    })

;(async () => {
    // alias 'version'
    if (args[0] === '-v' || args[0] === '--version')
        args[0] = 'version'

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
                    'You have already run the setup. Do you want to continue?',
                    'Press [Y] to overwrite, or [N] to abort.',
                    false)) {
                    credentials = JSON.parse(fs.readFileSync(credentials_path, {encoding: 'utf8'}))
                    console.log('\nLeave any field blank to keep the previous value.')
                } else
                    process.exit(0)
            }

            // do the setup
            credentials.icloud.email = await prompt('icloud email: ') || credentials.icloud.email
            credentials.icloud.password =
                await prompt('icloud app-specific password: ', true) || credentials.icloud.password
            credentials.icloud.p = await prompt('two digits after p (http://pXX-...): ') || credentials.icloud.p
            credentials.icloud.DSid = await prompt('DSid: ', true) || credentials.icloud.DSid
            credentials.icloud.pGUID = await prompt('pGUID: ', true) || credentials.icloud.pGUID
            credentials.campusnet.email = await prompt('campusnet email: ') || credentials.campusnet.email
            credentials.campusnet.password =
                await prompt('campusnet password: ', true) || credentials.campusnet.password

            fs.writeFileSync(credentials_path, JSON.stringify(credentials), {encoding: 'utf8'})
            break
        }
        case 'run': {
            const options = checkFlags('-q', '--quiet', '--once', '-y')
            // check if setup has been completed
            if (!fs.existsSync(credentials_path)) {
                console.error('You must run `cn-calendar setup` before usage.\n' +
                    'Please follow the instructions at https://github.com/drinking-code/cn-to-cal#setup')
                process.exit(2)
            }
            if (isRunning() && !options.includes('-y') && !options.includes('--once')) {
                if (!await confirm(
                    'The script is already running. Do you want to restart it?',
                    'Press [Y] to restart, or [N] to abort.',
                    false)
                )
                    process.exit(0)
                else
                    stopAll()
            }
            if (options.includes('--once')) {
                fork(index_path)
                    .on('exit', code => {
                        process.exit(code)
                    })
            } else {
                fs.rmSync(logPath, {force: true})
                // start background process
                if (!fs.existsSync(tmpPath))
                    fs.mkdirSync(tmpPath)
                const subprocess = spawn('node', [interval_path, logPath], {
                    detached: true,
                    cwd: process.env.PROJECT_DIRECTORY,
                    stdio: 'inherit'
                })
                fs.writeFileSync(path.join(tmpPath, subprocess.pid + '.pid'), '')

                if (!options.includes('-q') && !options.includes('--quiet')) {
                    console.log('The script is now running.')
                    console.log('Run `cn-calendar stop` to stop it.')
                }
                stopRL()
                process.exit(0)
            }
            break
        }
        case 'stop': {
            checkFlags()
            // stop background process
            if (!isRunning()) {
                console.error('The script is already stopped.')
                process.exit(1)
            } else {
                stopAll()
                console.log('Stopped the script successfully.')
            }
            break
        }
        case 'log': {
            checkFlags()
            if (!fs.existsSync(logPath)) break
            console.log(
                fs.readFileSync(logPath).toString()
            )
            break
        }
        case 'version': {
            printVersion()
            break
        }
        case 'update': {
            spawn('node', ['update.js'], {
                stdio: 'inherit',
                cwd: process.env.PROJECT_DIRECTORY
            })
            break
        }
        default:
            // error unknown command
            console.error(`Unknown command: '${args[0]}'`)
    }
    stopRL()
})()
