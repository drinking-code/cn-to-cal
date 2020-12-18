const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// todo: make comments here

const originalTTYWrite = rl._ttyWrite;

function confirm(msg, failMsg, dflt) {
    return new Promise(r => {
        let data = `${msg}${msg.endsWith(' ') ? '' : ' '}[${
            (dflt === null || dflt === undefined) ? 'y/n' :
                (dflt ? 'Y/n' : 'N/y')
        }]: `;
        rl.write(data)
        const keypress = (str, key) => {
            rl._ttyWrite = originalTTYWrite;
            if (key.sequence === '\x03') {
                rl.write('^C')
                process.exit('SIGINT')
            }
            if (key.name.length > 1) {
                rl._ttyWrite = keypress;
                return
            }

            switch (key.name) {
                case 'y':
                    rl.write('y\n')
                    return r(true)
                case 'n':
                    rl.write('n\n')
                    return r(false)
                case 'return':
                    rl.write(dflt ? 'y' : 'n' + '\n')
                    return r(dflt)
                default:
                    rl.write('\n' + failMsg + (failMsg.endsWith(' ') ? '' : ' '))
                    rl._ttyWrite = keypress;
            }
        }
        rl._ttyWrite = keypress;
    })
}

function prompt(msg, secret) {
    return new Promise(r => {
        rl.resume()
        rl.write(msg)
        let answer = '',
            cursorPos = msg.length
        const keypress = (str, key) => {
            // console.log(key)
            if (key.name === 'return') {
                rl._ttyWrite = originalTTYWrite;
                rl.write('\n')
                r(answer)
            } else if (key.sequence === '\x7F') { // backspace
                const i = cursorPos - msg.length
                answer = cursorPos === msg.length + answer.length ?
                    answer.substr(0, i - 1) :
                    answer.substr(0, i - 1) + answer.substr(i, answer.length);
                if (secret)
                    redrawLine(msg + '*'.repeat(answer.length), --cursorPos)
                else
                    redrawLine(msg + answer, --cursorPos)
            } else if (key.name === 'left') { // move cursor
                if (cursorPos > msg.length) {
                    cursorPos--
                    readline.moveCursor(process.stdout, -1, 0)
                }
            } else if (key.name === 'right') { // move cursor
                if (cursorPos < msg.length + answer.length) {
                    cursorPos++
                    readline.moveCursor(process.stdout, 1, 0)
                }
            } else if (key.sequence === '\x03') { // exit
                process.stdout.write('^C')
                process.exit('SIGINT')
            } else if (key.name.length > 1) {
            } else {
                if (cursorPos !== msg.length + answer.length) {
                    const i = cursorPos - msg.length
                    answer = answer.substr(0, i) + str + answer.substr(i, answer.length);
                    if (secret)
                        redrawLine(msg + '*'.repeat(answer.length), cursorPos + 1)
                    else
                        redrawLine(msg + answer, cursorPos + 1) // todo: here is a bug somewhere (pasting text in the middle of the prompt)
                } else {
                    answer += str
                    if (secret)
                        process.stdout.write('*')
                    else
                        process.stdout.write(str)
                }

                cursorPos++
            }
        }
        rl._ttyWrite = keypress;
    })
}

function redrawLine(data, cursorPos) {
    readline.clearLine(process.stdout, 0, () => {
        readline.cursorTo(process.stdout, 0, () => {
            process.stdout.write(data)
            readline.cursorTo(process.stdout, cursorPos)
        })
    })
}

module.exports = {confirm, prompt, stopRL: () => rl.close()}
