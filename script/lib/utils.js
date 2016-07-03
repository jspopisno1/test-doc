var fs = require('fs')
var npath = require('path')
var _ = require('lodash')

var utils = {
    ensureFolder: function(path) {
        if (!fs.existsSync(path)) {
            var dirname = npath.dirname(path)
            this.ensureFolder(dirname)

            fs.mkdirSync(path)
        }
    },

    ensureFile: function(path, defaultContent) {
        this.ensureFolder(npath.dirname(path))

        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, defaultContent)
        }
    },

    parsePath: function(path) {
        var rgx = /__\((\w+)\)([^\()]+)$/
        var pathWithoutTag = path.replace(rgx, '$2')
        var tag = (rgx.exec(path) || {1: ''})[1]

        var rgxSplit = /(.*)\.([^/]+)$/
        console.log('@debug, path', pathWithoutTag)
        var parts = rgxSplit.exec(pathWithoutTag) || {1: pathWithoutTag, 2: ''}

        return {
            filename: npath.basename(parts[1]),
            pathname: parts[1],
            extname: parts[2],
            tag: tag,
            path: parts[1] + '__(' + tag + ')' + (parts[2] ? '.' + parts[2] : '')
        }
    },

    flattenFiles: function(path, base, result) {
        var self = this
        if (!result) {
            var isInitialCall = true
            base = path
            result = {}
        }

        var stat = fs.statSync(path)
        var isFile = stat.isFile()

        var relativePath = npath.relative(base, path).replace('\\', '/')

        // http://www.linux-faqs.info/general/difference-between-mtime-ctime-and-atime
        var mtime = new Date(stat.mtime).getTime()

        if (isFile) {
            var tagInfo = this.parsePath(relativePath)
            result[relativePath] = _.extend({mtime: mtime}, tagInfo)
        } else {

            var files = fs.readdirSync(path)
            files.map(function(file) {
                if (file.substr(0, 1) == '.') return

                var filePath = path + '/' + file
                self.flattenFiles(filePath, base, result)
            })
        }

        if (isInitialCall) {
            return result
        }
    },

    readJSONFile: function(path) {
        var jsonString = fs.readFileSync(path)
        try {
            var json = JSON.parse(jsonString)
            if (!json) {return {}}
        } catch(ex) {
            return {tag: {}, backlinks: {}}
        }
        return json
    }
}

module.exports = utils