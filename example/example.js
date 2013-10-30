var watchdir = require('../');

var unwatch = watchdir(__dirname + '/monitor', function (file) {
  console.log(file);
});

setTimeout(function () {
  unwatch();
}, 5 + 60 * 1000);  // 5 min