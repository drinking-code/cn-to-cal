const fs = require('fs')
const path = require('path')
const fetch = require('cross-fetch')
const qs = require('querystring')

const monthsGerman = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const CAMPUSNET_HOST = 'https://campus.srh-hochschule-berlin.de'

async function getEvents() {
    let tries = 0

    let results = [null, null]

    while (tries < 4) {
        try {
            results = await _getEvents()
            break
        } catch (err) {
            if (tries >= 3) {
                console.error('Something went wrong too often. Stopping now.')
                process.exit(1)
            }
            console.error('Something went wrong. Retrying...')
            tries++
        }
    }

    return results
}

async function _getEvents() {
    const {
        campusnet: {
            email,
            password
        }
    } = JSON.parse(
        await fs.readFileSync(path.join(process.env.PROJECT_DIRECTORY, 'credentials.json')
            .toString()
        ))

    const res = await fetch(CAMPUSNET_HOST + '/scripts/mgrqispi.dll?', {
        method: 'post',
        body: qs.stringify({
            usrname: email.toUpperCase(),
            pass: password,
            APPNAME: 'CampusNet',
            PRGNAME: 'LOGINCHECK',
            ARGUMENTS: 'clino,usrname,pass,menuno,menu_type,browser,platform',
            clino: '000000000000001',
            menuno: '000299',
            menu_type: 'classic',
            browser: '',
            platform: ''
        }),
        headers: {
            Origin: CAMPUSNET_HOST,
            Referrer: CAMPUSNET_HOST,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }).then(res => {
        const session = res.headers.get('REFRESH').match(/\d+(?=,-N)/)[0]
        const cookie = res.headers.get('Set-cookie').replace(' ', '')

        return fetch(CAMPUSNET_HOST + '/scripts/mgrqispi.dll?', {
            method: 'post',
            body: qs.stringify({
                month: 'Y2021M05', // todo: make dynamic
                week: '0',
                APPNAME: 'CampusNet',
                PRGNAME: 'SCHEDULER_EXPORT_START',
                ARGUMENTS: 'sessionno,menuid,date',
                sessionno: session,
                menuid: '000449',
                date: 'Y2021M05'
            }),
            headers: {
                Cookie: cookie,
                Origin: CAMPUSNET_HOST,
                Referrer: CAMPUSNET_HOST,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
    }).then(res => {
        return res.text()
    }).then(html => {
        const href = html.match(/href="(\/scripts\/filetransfer.exe[^"]+)/)[1]
        return fetch('https://campus.srh-hochschule-berlin.de/' + href)
    })
        .catch(console.error)

    return await res.text()
}

_getEvents()

module.exports = getEvents
