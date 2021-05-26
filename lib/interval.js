const path = require('path')
const fs = require('fs')
const index_path = path.join(process.env.PROJECT_DIRECTORY, 'lib', 'index.js')

const start = () => {
    const logStream = fs.createWriteStream(process.argv[2], {flags: 'a'});
    const subprocess = require('child_process').spawn('node', [index_path])
    subprocess.stderr.pipe(logStream)
    subprocess.stdout.pipe(logStream)
    subprocess.on('exit', () => {
        logStream.end()
    })
}

setInterval(start, 1000 * 60 * 60 * 12);
start()
