const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

async function getEvents() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const {
        campusnet: {
            email,
            password
        }
    } = JSON.parse(await fs.readFileSync(path.join(process.mainModule.path, '../credentials.json'), {encoding: 'utf8'}))

    if (!email || !password) {
        let s = (!email && !password) ? 'email and password' : !email ? 'email' : 'password'
        console.error(`Could not find CampusNet ${s}.`)
        console.log(`Make sure you type in your ${s} when running \`cn-calendar setup\``)
        await browser.close()
        process.exit(61)
    }

    await page.goto('https://campus.srh-hochschule-berlin.de/', {waitUntil: 'networkidle0'});
    // console.log('page loaded')

    // login and wait until loaded
    await Promise.all([
        page.evaluate((email, password) => {
            document.querySelector('#field_user').value = email
            document.querySelector('#field_pass').value = password
            document.querySelector('#logIn_btn').click()
        }, email, password),
        page.waitForNavigation({waitUntil: 'networkidle2'})
    ])
    // console.log('logged in')

    if (await page.$('#link000300 a') === null) {
        console.error('Something went wrong. Please check whether your email and password for CampusNet are correct.')
        process.exit(13)
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
            events = await page.$$eval('.appMonth', (events, monthAndYear) => events.map(event => {
                const monthsGerman = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
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
                return {
                    day, time, location, title,
                    month: monthsGerman.indexOf(monthAndYear.replace(/ \d{4}/g, '')) + 1,
                    year: monthAndYear.match(/\d{4}/g)[0]
                }
            }), monthAndYear)
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
