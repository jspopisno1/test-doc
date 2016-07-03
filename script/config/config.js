var npath = require('path')
var config = {}

module.exports = {
    init: function (params) {
        var root = config.root = params.root
        
        config.content = params.content

        config.contentPath = npath.resolve(root + params.content)
        config.scriptPath = npath.resolve(root + (params.script || '/script'))

        config.fileIndexPath = npath.resolve(config.scriptPath + '/config/file-index.json')
    },
    config: config
}