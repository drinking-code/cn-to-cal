const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const monthsGerman = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

async function getEvents(tries) {
    tries = tries || 0

    let results = [null, null]

    while (tries < 4) {
        try {
            tries++
            results = await _getEvents()
            break
        } catch (e) {
            console.log(e)
            if (tries < 4)
                console.error('Something went wrong. Retrying...')
            else {
                console.error('Something went wrong too often. Stopping now.')
                process.exit(1)
            }
        }
    }

    return results
}

async function _getEvents() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const {
        campusnet: {
            email,
            password
        }
    } = JSON.parse(await fs.readFileSync(path.join(process.env.PROJECT_DIRECTORY, 'credentials.json'), {encoding: 'utf8'}))

    if (!email || !password) {
        let s = (!email && !password) ? 'email and password' : !email ? 'email' : 'password'
        console.error(`Could not find CampusNet ${s}.`)
        console.log(`Make sure you type in your ${s} when running \`cn-calendar setup\``)
        await browser.close()
        process.exit(61)
    }

    await Promise.all([
        page.waitForSelector('#field_user'),
        page.goto('https://campus.srh-hochschule-berlin.de/'),
    ])
    console.log('page loaded')

    // login and wait until loaded
    try {
        await page.type('#field_user', email)
        await page.type('#field_pass', password)
        await page.evaluate(() => document.querySelector('#logIn_btn').click())
        await page.waitForSelector('#link000300 a')
        console.log('logged in')
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            console.error('Something went wrong. Please check whether your email and password for CampusNet are correct.')
            process.exit(13)
        }
    }

    // click on "Termine" and wait until loaded
    await Promise.all([
        page.click('#link000300 a'),
        page.waitForNavigation({waitUntil: 'networkidle2'})
    ])
    // console.log('is now on page "Termine"')

    // click on "Monat" and wait until loaded
    await Promise.all([
        page.click('#weekform .tb .nb td.tbcontrol a:nth-of-type(2)'),
        page.waitForNavigation({waitUntil: 'networkidle2'})
    ])
    // console.log('is now in the "Monate" view')

    // get all info for this month
    const getMonthInfo = async () => {
        const monthAndYear = await page.$eval('#tbmonthContainer div:first-child', el => el.innerHTML),
            events = await page.$$eval('.appMonth', (
                events,
                monthAndYear,
                monthsGerman
            ) => events.map(event => {
                const info = event.querySelector('a').getAttribute('title').split(' / '),
                    day = event.parentElement.getAttribute('title').replace(/ /g, ''),
                    time = info[0].split(' - '),
                    location = info[1]
                let title = info[2],
                    i = 3
                // this adds unwanted, split off parts of the title back
                while (info[i]) {
                    title += ' / ' + info[i]
                    i++
                }

                const replaceSpecial = string => string
                    .replace(/ä/g, 'ae')
                    .replace(/ö/g, 'oe')
                    .replace(/ü/g, 'ue')
                    .replace(/Ä/g, 'Ae')
                    .replace(/Ö/g, 'Oe')
                    .replace(/Ü/g, 'Ue')
                    .replace(/ß/g, 'ss')

                // replace ä, ö, ü, ß, Ä, Ö, Ü in advance (now), so that location and title match in the comparison
                // -> reduces amount of event creation & deletion -> faster
                return {
                    day, time, location: replaceSpecial(location), title: replaceSpecial(title),
                    month: monthsGerman.indexOf(monthAndYear.replace(/ \d{4}/g, '')) + 1,
                    year: monthAndYear.match(/\d{4}/g)[0]
                }
            }), monthAndYear, monthsGerman)
        return {name: monthAndYear.replace(/ \d{4}/g, ''), events}
    }
    const currentMonth = await getMonthInfo()
    // console.log('got info for this month')

    // click on ">" (next month) and wait until loaded
    await Promise.all([
        page.click('#tbmonthContainer .arrow_skipBtn a:nth-of-type(3)'),
        page.waitForNavigation({waitUntil: 'networkidle2'})
    ])
    // console.log('is now in the next month of the "Monate" view')

    // get all info for next month
    const nextMonth = await getMonthInfo()
    // console.log('got info for next month')

    await browser.close();

    return [currentMonth, nextMonth]
}

module.exports = getEvents
