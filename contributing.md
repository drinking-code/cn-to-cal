# Contributing
- [Structure](#structure)
- [Understanding the code](#understanding-the-code)
- [Extending Calendar Support](#extending-calendar-support)
  - [CalDAV](#caldav)
  - [Implementing new cloud calendars](#implementing-new-cloud-calendars)
## Structure
This Repository consists of multiple script files. `lib/index.js` is the main script file that runs trough the synchronisation process. `cli.js` invokes either `lib/index.js` directly, or the `lib/interval.js` which itself invokes `lib/index.js` every 12 hours.  
Look at this wonderful box drawing:
```
┌──────────────┐        ┌───────────────────┐
│              │ ┄┄┄┄┄> │  lib/interval.js  │ ┄┄┄┄┄┄┄┄v
│    cli.js    │        └───────────────────┘┌────────────────┐
│              │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄> │  lib/index.js  │
└──────────────┘                             └────────────────┘
        ┆                                       v        ┆
        v           ┌───────────────────────────────┐    ┆
┌─────────────────┐ │  lib/scrapegoat-extension.js  │    ┆
│  lib/prompt.js  │ └───────────────────────────────┘    v
└─────────────────┘                             ┌─────────────────────┐
                                                │  lib/cn-scraper.js  │
                                                └─────────────────────┘
```
## Understanding the code
I tired my best to comment the code properly; `cli.js` and `lib/prompt.js` will receive comments shortly.

Here is what every file does:
- `cli.js` gets executed when running `cn-calendar [<command>]` and manages all commands
- `lib/prompt.js` provides two functions:  a "normal" cli prompt and a cli prompt to confirm
- `lib/interval.js` invokes `lib/index.js` once and then every 12 hours
- `lib/scrapegoat-extension.js` extends the [scrapegoat](https://www.npmjs.com/package/scrapegoat) package to create and delete events in Apple iCloud Calendar
- `lib/cn-scraper.js` uses [Puppeteer](https://www.npmjs.com/package/puppeteer) to scrape events from CampusNet
- `lib/index.js` is the main script and uses `lib/cn-scraper.js` and _scrapegoat_ to scrape events from both CampusNet and Apple  Calendar. It then compares the events and finds out, which events have to be created and which have to be deleted. With `lib/scrapegoat-extension.js` it then creates and deletes the evaluated events.

## Extending calendar support
### CalDAV
_Scrapegoat_ uses the [CalDAV](https://tools.ietf.org/html/rfc4791) protocol to communicate to Apple Calendar. The only part of the package specific to Apple Calendar is the URL finding everything else should be handled by the standard. That means that (in theory) for every cloud calendar that supports the CalDAV protocol only a URL finding process has to be developed.  
Some calendars however (e.g. Google CalDAV API) require a quite complex authentication process in order to gain access to the API thus making the implementation into this package more painful than just logging in and out of the CampusNet-app every day.
### Implementing new cloud calendars
The package is currently not build for choosing between calendars or even protocols. Building this kind of switch will be a bit of a hassle, I recon. But once it is there, support for calendars can be added uninhibitedly.
