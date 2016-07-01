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
    diffFiles: function(fileIndex, allFileInfo) {
        var tags = _.extend({}, fileIndex.tags)
    }
}

console.log(allFileInfo)