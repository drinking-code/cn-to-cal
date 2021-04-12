const fs = require('fs'),
    path = require('path'),
    Scrapegoat = require('./scrapegoat-extension'),
    {makeDate} = Scrapegoat,
    getCnEvents = require('./cn-scraper')

if (!process.env.PROJECT_DIRECTORY)
    process.env.PROJECT_DIRECTORY = __filename.replace('lib/index.js', '')

const {
        icloud: {
            email,
            password,
            p,
            DSid,
            pGUID
        }
    } = (function () {
        try {
            // get credentials from json
            return JSON.parse(fs.readFileSync(path.join(process.env.PROJECT_DIRECTORY, 'credentials.json'), {encoding: 'utf8'}))
        } catch (err) {
            console.error('You must run `cn-calendar setup` before usage.\n' +
                'Please follow the instructions at https://github.com/drinking-code/cn-to-cal#setup')
            process.exit(1)
        }
    })(),
    // base config for scrapegoat (icloud calDAV API)
    config = {
        auth: {
            user: email,
            pass: password,
            sendImmediately: true
        },
        // example using baikal as CalDAV server
        uri: `https://p${p}-caldav.icloud.com/${DSid}/calendars/${pGUID}`
    },
    scrapegoat = new Scrapegoat(config),
    thisMonthNumber = (new Date()).getMonth() + 1,
    thisYearNumber = (new Date()).getFullYear(),
    nextMonthNumber = thisMonthNumber === 12 ? 1 : thisMonthNumber + 1,
    nextYearNumber = thisMonthNumber === 12 ? thisYearNumber + 1 : thisYearNumber
let toCreate = [],
    toDelete = [],
    failedDel = 0,
    failedCre = 0;

(async () => {
    // function for later on
    function getNonOccurring(mainArr, targetArr) {
        let list = []
        // check what types arrays are (icloud events or cn-events)
        // -> variable to be able to compare events properly later
        const mainArrIsICType = mainArr[0] ? !!mainArr[0]?.data : !!targetArr[0]?.day
        // goes through every entry of mainArray
        mainArr.forEach(eventM => {
            let isSynced = false
            // compare every mainArr entry to every targetArr entry
            for (let eventT of targetArr) {
                function eventsMatch(iCEvent, CNEvent) {
                    return (
                        // if days don't match
                        CNEvent.day !== new Date(iCEvent.data.start).getDate().toString() ||
                        // if start times don't match (.getHours return hours with local time offset)
                        CNEvent.time[0] !== (() => {
                            const date = new Date(iCEvent.data.start),
                                hours = date.getHours(),
                                minutes = date.getMinutes()
                            return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes
                        })() ||
                        // if titles don't match
                        CNEvent.title !== iCEvent.data.title
                    )
                }

                if (
                    (mainArrIsICType && eventsMatch(eventM, eventT)) || // case: eventM is a iCloud event
                    (!mainArrIsICType && eventsMatch(eventT, eventM)) // case: eventT is a iCloud event
                ) continue // do nothing if events don't match -> isSynced assumes false
                // otherwise (events do match) -> set isSynced to true and stop loop
                isSynced = true
                break
            }
            // if isSynced is false still, the eventM is not in targetArr
            if (!isSynced)
                list.push(eventM)
        })
        // console.log(list)
        return list
    }

    console.log('Scraping events from campusnet... Please wait, this may take a while.')
    // const eventsCN = await getCnEvents()
    const eventsCN = JSON.parse(
        fs.readFileSync(path.join(process.env.PROJECT_DIRECTORY, 'data_b.json')).toString()
    )

    console.log('Syncing to your calendar...')
    const getEventsOfMonth = (month, year) => scrapegoat.getEventsByTime(
        makeDate([year, month, 1, 0, 0]),
        makeDate([year, month,
            new Date(year, month, 0).getDate(),
            23, 59]))

    // determine which events to create / to delete (for the current month)
    await getEventsOfMonth(thisMonthNumber, thisYearNumber)
        .then(res => {
            // determines which events should be deleted
            toDelete = toDelete.concat(getNonOccurring(res, eventsCN[0].events))
            toCreate = toCreate.concat(getNonOccurring(eventsCN[0].events, res))
        })

    // determine which events to create / to delete (for the current month)
    await getEventsOfMonth(nextMonthNumber, nextYearNumber)
        .then(res => {
            // determines which events should be deleted
            toDelete = toDelete.concat(getNonOccurring(res, eventsCN[1].events))
            toCreate = toCreate.concat(getNonOccurring(eventsCN[1].events, res))
        })

    // todo: update events with changed locations and/or end times

    // delete all events in toDelete (all apple calender events)
    for (let event of toDelete) {
        await scrapegoat.deleteEvent(path.basename(event.ics, '.ics'))
            .catch(err => {
                console.log('Error: Could not delete event: ' + err)
                failedDel++
            })
    }

    // create all events in toCreate (all campusnet events)
    for (let event of toCreate) {
        await scrapegoat.createEvent('cnCal', event.title,
            [event.year, event.month, event.day, event.time[0].match(/\d\d(?=:)/)[0], event.time[0].match(/\d\d$/)[0]],
            [event.year, event.month, event.day, event.time[1].match(/\d\d(?=:)/)[0], event.time[1].match(/\d\d$/)[0]],
            event.location)
            .catch(err => {
                if (err.statusCode === 400) {
                    console.log(`
Error: Could not create event:
${event.title}
${event.day}.${event.month}.${event.year}, ${event.time.join(' - ')}
${event.location}
This is likely a problem with the Apple Calendar API. If possible, add this event manually.\n`
                    )
                } else {
                    console.log('Error: Could not create event: ' + err +
                        '\nfor event:\n' + JSON.stringify(event))
                    failedCre++
                }
            })
    }

    // print report
    const scrapedNumber = eventsCN[0].events.length + eventsCN[1].events.length,
        deletedNumber = toDelete.length - failedDel,
        createdNumber = toCreate.length - failedCre
    console.log('')
    console.log(`scraped ${scrapedNumber} event${scrapedNumber === 1 ? '' : 's'}.`)
    console.log(`deleted ${deletedNumber} event${deletedNumber === 1 ? '' : 's'}, failed to delete ${failedDel}.`)
    console.log(`created ${createdNumber} event${createdNumber === 1 ? '' : 's'}, failed to create ${failedCre}.`)
})()
