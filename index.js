const fs = require('fs')
const Scrapegoat = require("scrapegoat");
const request = require('scrapegoat/lib/request')

// get credentials from json
const {icloud: {email, password, p, DSid, pGUID}} = JSON.parse( fs.readFileSync('./credentials.json', {encoding: 'utf8'}) )

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

// takes an array of year, month etc. and returns a string YYYYMMDDThhmm00Z (e.g. 20201224T223000Z) (in UTC)
function makeDate([year, month, day, hour, minute]) {
    if (year < 1970) throw new Error('year must be greater than 1970')
    if (month > 12) throw new Error('month must be less than 12')
    if (day > 31) throw new Error('day must be less than 31')
    if (hour > 24) throw new Error('hour must be less than 24')
    if (minute > 60) throw new Error('minute must be less than 60')

    const date = new Date(year, --month, day, hour, minute)
    return date.toISOString()
        .replace(/-/g, '')
        .replace('.000', '')
        .replace(/:/g, '')
}

// expand Scrapegoat to create events in the calendar
Scrapegoat.prototype.createEvent = function(key, title, startTime, endTime, location) {
    // clone config
    let config = {...this.config}
    // create a unique id
    const uid = Number(
        parseInt(key.toLowerCase(), 36) + '' +
        Number(startTime.join(''))
    ).toString(16)
    // uri needs to be a specific .ics (in the give calendar)
    config.uri += '/' + uid + '.ics';
    config.headers = {
        'Content-Type': 'text/calendar; charset=utf-8'
    }
    // depth must be set to 0 for all requests not using "REPORT" method (idk what it does)
    return request(config, "PUT", 0, `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//cn-scraper//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:${title}
DTSTART:${makeDate(startTime)}
DTEND:${makeDate(endTime)}
LOCATION:${location || ''}
END:VEVENT
END:VCALENDAR`)
}

const scrapegoat = new Scrapegoat(config);
scrapegoat.createEvent('BAWD34', 'Test', [2020,12,9,22,30], [2020,12,9,23,0], 'dab_Onlinelehre via TEAMS')
    .then(console.log)
    .catch(console.error)
