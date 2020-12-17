setInterval(function () {
    console.log('Logging at ' + (new Date).toISOString());
}, 1000 /** 60 * 60*/ * 12);
console.log('Logging at ' + (new Date).toISOString());
