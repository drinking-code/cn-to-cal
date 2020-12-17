setInterval(function () {
    require('child_process').fork(index_path)
}, 1000 * 60 * 60 * 12);
console.log('Logging at ' + (new Date).toISOString());
