const path = require('path')
const index_path = path.join(process.cwd(), 'lib', 'index.js')
const start = () => require('child_process').fork(index_path)

setInterval(function () {
    start()
}, 1000 * 60 * 60 * 12);
start()
