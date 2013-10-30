var watchdir = require('../');


watchdir(__dirname + '/monitor', function (file) {
  console.log(file);
});