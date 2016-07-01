var fs = require('fs')
var npath = require('path')

var utils = {
    ensureFile: function(path, defaultContent) {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, defaultContent)
        }
    },

    flattenFiles: function(path, base, result) {
        if (!result) {
            var isInitialCall = true
            base = path
            result = {}
        }

        var stat = fs.statSync(path)
        var isFile = stat.isFile()

        var relativePath = npath.relative(base, path)
        var mtime = new Date(stat.mtime).getTime()
        var ctime = new Date(stat.ctime).getTime()

        if (isFile) {
            result[relativePath] = {path: relativePath, mtime: mtime, ctime: ctime, isFile: true}
        } else {
            result[relativePath] = {path: relativePath, mtime: mtime, ctime: ctime, isFile: false}

            var files = fs.readdirSync(path)
            files.map(function(file) {
                if (file.substr(0, 1) == '.') return

                var filePath = path + '/' + file
                utils.flattenFiles(filePath, base, result)
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
            return {}
        }
        return json
    }
}

module.exports = utils