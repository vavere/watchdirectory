var watchdir = require('../');

var watcher = watchdir(__dirname + '/monitor', function (file, stats, prevStats, event) {
  console.log(event + ' ' + file);
});

var i = setInterval(function () {
  console.log(watcher);
}, 10 * 1000);  // 10 sek

setTimeout(function () {
  watcher.unwatch();
  clearInterval(i)
}, 5 + 60 * 1000);  // 5 min