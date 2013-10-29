var fs = require('fs');
var np = require('path');

module.exports = function watchdir(dirname, options, listener) {
  if (listener === undefined) {
    listener = options;
    options = {};
  }
  if (options.persistent === undefined) {
    options.persistent = true;
  }
  if (options.interval === undefined) {
    options.interval = 100;
  }
  if (options.recursive === undefined) {
    options.recursive = true;
  }
  if (options.initial === undefined) {
    options.initial = 'initial';
  }
  if (options.exclude === undefined) {
    options.exclude = {
      node_modules: true
    };
  }

  function matches(name, filter, defaultValue) {
    if (filter === undefined) {
      return defaultValue;
    } else if (typeof filter === 'string') {
      var ext = filter;
      return name.indexOf(ext, name.length - ext.length) !== -1;
    } else if (filter.constructor === RegExp) {
      return filter.test(name);
    } else if (typeof filter === 'function') {
      return filter(name);
    } else {
      return filter[name] === true;
    }
  }

  function filter(name) {
    if (matches(name, options.exclude, false)) {
      return false;
    } else {
      return matches(name, options.include, true);
    }
  }

  var watchedFiles = {};

  function notifyListener(filename, curr, prev, change) {
    if (filter(filename)) {
      return listener(filename, curr, prev, change);
    }
  }

  function fsListener(filename, depth, curr, prev) {
    var change = curr.nlink === 0 ? 'deleted' : prev.nlink === 0 ? 'created' : 'modified';
    notifyListener(filename, curr, prev, change);
    if (change !== 'deleted') {
      return watchFile(filename, depth, curr);
    } else {
      return unwatchFile(filename);
    }
  }

  function unwatchFile(filename) {
    fs.unwatchFile(filename, watchedFiles[filename]);
    return delete watchedFiles[filename];
  }

  function watchFile(filename, depth, stats) {
    if (depth === undefined) {
      depth = 0;
    }
    if (stats === undefined) {
      stats = fs.statSync(filename);
    }
    if (stats.nlink > 0) {
      if (stats.isDirectory()) {
        if (!matches(filename, options.exclude, false)) {
          if (depth === 0 || options.recursive) {
            var _ref = fs.readdirSync(filename);
            for (var _i = 0, _len = _ref.length; _i < _len; _i++) {
              var child = _ref[_i];
              child = np.join(filename, child);
              watchFile(child, depth + 1);
            }
          }
        }
      }
      if (watchedFiles[filename] === undefined) {
        var boundListener = fsListener.bind(this, filename, depth);
        watchedFiles[filename] = boundListener;
        fs.watchFile(filename, options, boundListener);
        if (initial) {
          notifyListener(filename, stats, stats, initial);
        }
      }
    }
  }

  var initial = options.initial;
  watchFile(dirname);
  initial = 'created';
  return function unwatch() {
    for (var key in watchedFiles)
      unwatchFile(key);
  };
};

