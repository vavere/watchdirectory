var fs = require('fs');
var np = require('path');
var async = require('async');
var debug = require('debug')('watchdir');

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

  var watchedFiles = {
    onready: function () {},
    unwatch: function () {
      for (var key in this)
        unwatchFile(key);
    }
  };

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

  function watchFile(filename, depth, prevStats, cb) {
    if (typeof depth == 'function') {
      cb = depth;
      depth = null;
      prevStats = null;
    }
    if (typeof prevStats == 'function') {
      cb = prevStats;
      prevStats = null;
    }
    depth = depth || 0;
    cb = cb || function () {};

    debug('watch ' + filename);
    if (!prevStats)
      fs.stat(filename, step);
    else
      step(null, prevStats);

    function step(err, stats) {
      if (err) return cb(err);
      if (!stats.nlink) cb();

      // watch file
      if (!watchedFiles[filename]) {
        var boundListener = fsListener.bind(this, filename, depth);
        watchedFiles[filename] = boundListener;
        fs.watchFile(filename, options, boundListener);
        if (initial) {
          notifyListener(filename, stats, stats, initial);
        }
      }
      // watch directory
      if (!stats.isDirectory())
        return cb();

      if (!matches(filename, options.exclude, false)) {
        if (depth === 0 || options.recursive) {
          fs.readdir(filename, function (err, files) {
            async.each(files, function (child, cb) {
              watchFile(np.join(filename, child), depth + 1, cb);
            }, cb);
          });
        }
      }
    }

  }

  debug('init');
  var initial = options.initial;
  watchFile(dirname, function () {
    initial = 'created';
    debug('ready');
    watchedFiles.onready();
  });
  return watchedFiles;
};

