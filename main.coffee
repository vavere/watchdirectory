fs = require 'fs'
np = require 'path'

# watches a directory recursively for file changes
# will call the listener once for each matching file
# immediately and then whenever
# files are changed, deleted or created
exports.watchDirectory = (dirname, options, listener) ->
    if not listener?
        listener = options
        options = {}
    options.persistent ?= true
    options.interval ?= 100
    options.recursive ?= true
    # change message for initial pass. Use false for no initial pass.
    options.initial ?= 'initial'
    options.exclude ?=
        node_modules: true
    # options.filter = string extension or RegExp or function

    matches = (name, filter, defaultValue) ->
        if not filter?
            defaultValue
        else if typeof filter is 'string'
            ext = filter
            name.indexOf(ext, name.length - ext.length) isnt -1
        else if filter.constructor is RegExp
            filter.test name
        else if typeof filter is 'function'
            filter name
        else
            filter[name] is true

    filter = (name) ->
        if matches name, options.exclude, false
            false
        else
            matches name, options.include, true

    watchedFiles = {}   # filename => bound listener

    notifyListener = (filename, curr, prev, change) ->
        if filter filename
            listener filename, curr, prev, change

    fsListener = (filename, depth, curr, prev) ->
        change =
            if curr.nlink is 0
                'deleted'
            else if prev.nlink is 0
                'created'
            else
                'modified'
        notifyListener filename, curr, prev, change
        # we call watchFile again in case children were added
        if change isnt 'deleted'
            watchFile filename, depth, curr
        else
            unwatchFile filename

    unwatchFile = (filename) ->
        fs.unwatchFile filename, watchedFiles[filename]
        delete watchedFiles[filename]

    watchFile = (filename, depth=0, stats) ->
        stats ?= fs.statSync filename
        if stats.nlink > 0
            if stats.isDirectory()
                # also watch all children
                # exclude directories in exclude list
                if not matches filename, options.exclude, false
                    if depth is 0 or options.recursive
                        for child in fs.readdirSync filename
                            child = np.join filename, child
                            watchFile child, depth + 1

            if not watchedFiles[filename]?
                boundListener = fsListener.bind @, filename, depth
                watchedFiles[filename] = boundListener
                fs.watchFile filename, options, boundListener
                if initial
                    notifyListener filename, stats, stats, initial
        return

    initial = options.initial
    watchFile dirname
    initial = 'created'

    # return a function that will unwatch all watched files
    ->
        for key of watchedFiles
            unwatchFile key