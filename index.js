const fs = require('fs')
const path = require('path')
const Scrapegoat = require("./scrapegoat-extension");
const {makeDate} = Scrapegoat

function getCredentials() {
    try {
        // get credentials from json
        return JSON.parse(fs.readFileSync('./credentials.json', {encoding: 'utf8'}))
    } catch (err) {
        console.error('You must run `cn-calendar setup` before usage.\n' +
            'Please follow the instructions at https://github.com/drinking-code/cn-to-cal#setup')
        process.exit(1)
    }
}

const {
    icloud: {
        email,
        password,
        p,
        DSid,
        pGUID
    }
} = getCredentials()

// base config for scrapegoat (icloud calDAV API)
const config = {
    auth: {
        user: email,
        pass: password,
        sendImmediately: true
    },
    // example using baikal as CalDAV server
    uri: `https://p${p}-caldav.icloud.com/${DSid}/calendars/${pGUID}`
};

const scrapegoat = new Scrapegoat(config);
/*scrapegoat.createEvent('BAWD34', 'Test', [2020,12,9,22,30], [2020,12,9,23,0], 'dab_Onlinelehre via TEAMS')
    .then(console.log)
    .catch(console.error)*/

/*scrapegoat.getEventsByTime(makeDate([2020, 12, 0, 0, 0]), makeDate([2021, 1, 31, 23, 59]))
    .then(res => {
        scrapegoat.deleteEvent(
            path.basename(res[0].ics, '.ics')
        )
    })*/
