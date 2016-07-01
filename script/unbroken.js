var fs = require('fs')
var npath = require('path')
var utils = require('./lib/utils')
var _ = require('lodash')

var configIniter = require('./config/config')

configIniter.init({
    root: npath.resolve(__dirname + '/../'),
    content: '/content'
})

var config = configIniter.config

utils.ensureFile(config.fileIndexPath, '{}')

var allFileInfo = utils.flattenFiles(config.contentPath)

fs.writeFileSync('tmp.json', JSON.stringify(allFileInfo, null, 3))

/**
 * fileIndex: {}
 *  files: {}
 *      $filePath: {}
 *          path        // String - path of the file
 *          namedPath   // String - path of the file without tag
 *          tag         // String - the auto generated tag
 *          mtime       // number - timestamp of modified
 *  tags: {}
 *      $tag: filePath      // String
 *  links: {}
 *      $tag: []
 *          $i: filePath    // String
 *
 * @type {*|{}}
 */
var fileIndex = utils.readJSONFile(config.fileIndexPath)

var unbrokenUtils = {
    diffFiles: function (fileIndex, allFileInfo) {
        var tags = _.extend({}, fileIndex.tags)

        // current path : fileInfo
        var newPages = {}

        // tag : fileInfo
        var unknownPages = {}

        // tag : 1 for all followings
        var pathChanged = {}
        var contentChanged = {}
        var missingPages = {}

        // tag : [...fileInfo]
        var duplicatePages = {}
        var duplicateChecks = {}

        for (var path in allFileInfo) {
            var fileInfo = allFileInfo[path]

            if (!fileInfo.tag) {
                // newPages
                newPages[path] = fileInfo
            } else {
                if (duplicateChecks[fileInfo.tag]) {
                    if (!duplicatePages[fileInfo.tag]) {
                        duplicatePages[fileInfo.tag] = [duplicateChecks[fileInfo.tag]]
                    }
                    duplicatePages[fileInfo.tag].push(fileInfo)
                }
                else {
                    duplicateChecks[fileInfo.tag] = fileInfo
                }

                if (fileInfo.tag in tags) {
                    var prevInfo = fileIndex[tags[fileInfo.tag]]
                    if (prevInfo.path != path) {
                        pathChanged[fileInfo.tag] = 1
                    }
                    if (prevInfo.mtime < fileInfo.mtime) {
                        contentChanged[fileInfo.tag] = 1
                    }

                    delete tags[fileInfo.tag]
                } else {
                    unknownPages[fileInfo.tag] = fileInfo
                }
            }
        }


        for (var tag in tags) {
            missingPages[tag] = 1
        }

        return {
            newPages: newPages,
            unknownPages: unknownPages,

            pathChanged: pathChanged,
            contentChanged: contentChanged,
            missingPages: missingPages,

            duplicatePages: duplicatePages
        }
    },

    CONTS: {
        DAY_IN_MILLIS: 24 * 3600 * 1000,
        CHAR3_IN_BASE36: Math.pow(36, 3)
    },

    getHash: function() {
        var date = new Date()
        var time = date.getTime()

        var remainder = time % this.CONTS.DAY_IN_MILLIS
        return '' + date.getFullYear() + (date.getMonth() + 1) + date.getDate()
            + remainder.toString(36) + Math.floor(this.CONTS.CHAR3_IN_BASE36 * Math.random()).toString(36)
    },

    handleNewPages: function(newPages, contentPath) {
        for (var path in newPages) {
            var fileInfo = newPages[path]
            
            var hash = this.getHash()
            fs.renameSync(contentPath + '/' + path,
                contentPath + '/' + fileInfo.pathname + '__[' + fileInfo.tag + '].' + fileInfo.extname)
        }
    }
}

var diff = unbrokenUtils.diffFiles(fileIndex, allFileInfo)
unbrokenUtils.handleNewPages(diff.newPages, config.contentPath)


console.log(allFileInfo, diff)