const Scrapegoat = require("scrapegoat");
const request = require('scrapegoat/lib/request')

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

function replaceSpecial(string) {
    return string
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/Ä/g, 'Ae')
        .replace(/Ö/g, 'Oe')
        .replace(/Ü/g, 'Ue')
        .replace(/ß/g, 'ss')
}

// expand Scrapegoat to create events in the calendar
Scrapegoat.prototype.createEvent = function (key, title, startTime, endTime, location) {
    // clone config
    let config = {...this.config}
    // create a unique id
    const uid = key + '-' + (
        parseInt(
            title.toLowerCase()
                .replace(/[^0-9a-z]/g, '')
                .replace(/.(.)/g, '$1')
                .substr(0,12), 36)
            .toString(24) + '-' +
        Number(startTime.join('')).toString(24)
    )
    // uri needs to be a specific .ics (in the given calendar)
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
SUMMARY:${replaceSpecial(title)}
DTSTART:${makeDate(startTime)}
DTEND:${makeDate(endTime)}
LOCATION:${replaceSpecial(location || '')}
END:VEVENT
END:VCALENDAR`)
}

Scrapegoat.prototype.deleteEvent = function (uid) {
    // clone config
    let config = {...this.config}
    // uri needs to be a specific .ics (in the given calendar)
    config.uri += '/' + uid + '.ics';
    return request(config, "DELETE", 0, '')
}

const _export = module.exports = Scrapegoat;
_export.makeDate = makeDate;
