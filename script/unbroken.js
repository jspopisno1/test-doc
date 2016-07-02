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
 *  tags: {}
 *      $tag: {}      // filePath
 *          path: String    - path of the file
 *          pathname: String
 *          extname: String
 *          tag: String     - the auto generated tag
 *          mtime: number   - timestamp of modified
 *  backlinks: {}
 *      $tag: []
 *          $i: tag       // String
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
                    if (+prevInfo.mtime < fileInfo.mtime) {
                        if (/(^|\.)md$/.exec(fileInfo.extname)) {
                            contentChanged[fileInfo.tag] = 1
                        }
                    }

                    delete tags[fileInfo.tag]
                } else {
                    unknownPages[fileInfo.tag] = fileInfo
                }
            }
        }

        return {
            newPages: newPages,
            unknownPages: unknownPages,

            pathChanged: pathChanged,
            contentChanged: contentChanged,

            duplicatePages: duplicatePages
        }
    },

    CONTS: {
        DAY_IN_MILLIS: 24 * 3600 * 1000,
        CHAR3_IN_BASE36: Math.pow(36, 3)
    },

    getTag: function () {
        var date = new Date()
        var time = date.getTime()

        var remainder = time % this.CONTS.DAY_IN_MILLIS

        var month = date.getMonth() + 1
        var day = date.getDate()

        return '' + date.getFullYear()
            + (month < 10 ? '0' + month : month)
            + (day < 10 ? '0' + day : day)
            + '_'
            + Math.floor(this.CONTS.CHAR3_IN_BASE36 * Math.random()).toString(36)
            + remainder.toString(36)
    },

    generatePath: function (fileInfo) {
        return fileInfo.pathname + '__[' + fileInfo.tag + ']' +
            (fileInfo.extname ? '.' + fileInfo.extname : '')
    },

    handleNewPages: function (newPages, contentPath, currentTags, contentChanged) {
        for (var path in newPages) {
            var fileInfo = newPages[path]

            var tag = this.getTag()
            fileInfo.tag = tag

            var newPath = this.generatePath(fileInfo)

            fileInfo.path = newPath

            fs.renameSync(contentPath + '/' + path, contentPath + '/' + newPath)

            currentTags[fileInfo.tag] = fileInfo
            if (/(^|\.)md$/.exec(fileInfo.extname)) {
                contentChanged[fileInfo.tag] = 1
            }
        }
    },

    handleUnknownPages: function (unknownPages, currentTags, contentChanged) {
        for (var tag in unknownPages) {
            var fileInfo = unknownPages[tag]

            currentTags[tag] = fileInfo
            if (/(^|\.)md$/.exec(fileInfo.extname)) {
                contentChanged[fileInfo.tag] = 1
            }
        }
    },

    wrapBackLink: function (title, link, tag, type, hash) {
        return '<span type="' + type + '" tag="' + tag + '" hash="' + hash + '">'
            + (type == 'image' ? '!' : '')
            + '[' + title + '](' + link + ')</span>'
    },

    escapeRegExp: function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },

    getBacklinkRgx: function () {
        return new RegExp(
            '<span'
            + '\s*?type="(image|link)"'     // #1 : type
            + '\s*?tag="([^"]+?)"'          // #2 : tag
            + '\s*?hash="([^"]*?)">\s*?'    // #3 : hash
            + '!?\\[([^\\]]*?)\\]'          // #4 : title
            + '\\([^\\)]*?\\)'              // #5 : link
            + '\s*?</span>',
            'g'
        )
    },

    searchInPath: function (keywordString, currentTags) {
        var rgxHash = /#(.*)$/
        var hashString = ''
        keywordString = keywordString.replace(rgxHash, function (match, hash) {
            hashString = hash || ''
            return ''
        })

        var rgxTag = /:(.*)$/
        var tagString = ''
        keywordString = keywordString.replace(rgxTag, function (match, tag) {
            tagString = tag || ''
            return ''
        })

        var keywords = keywordString.split('/')
        var self = this

        var regexpString = keywords.map(function (keyword, index) {
                var regexpStringPart
                if (index == keywords.length - 1) {
                    regexpStringPart = '[^/]*?' + self.escapeRegExp(keyword)
                            .replace(/\s+/g, '[^/]*?') + '[^/]*?'
                } else {
                    regexpStringPart = '.*?' + self.escapeRegExp(keyword)
                            .replace(/\s+/g, '.*?') + '.*?'
                }
                return regexpStringPart
            }).join('/')
            + (!!tagString ? '__\\[.*?' + tagString + '.*?\\].*?' : '')
            + '$'

        var rgx = new RegExp(regexpString)

        var matched = null
        for (var tag in currentTags) {
            var fileInfo = currentTags[tag]

            var path = fileInfo.path
            if (path.match(rgx)) {
                if (matched) {
                    return {mode: 'duplicated'}
                }
                matched = tag
                console.log('@debug, matched = ', path, rgx)
            }
        }

        if (matched) {
            return {mode: 'found', tag: matched, hash: hashString}
        }
    },

    setBacklink: function (to, from, backlinks) {
        backlinks[to] = backlinks[to] || {}
        backlinks[to][from] = 1
    },

    handleContentChanged: function (contentChanged, contentPath, currentTags, backlinks) {

        var self = this
        var actionNotDone = {}
        var contentProcessed = {}

        for (var tag in contentChanged) {
            var fileInfo = currentTags[tag]

            // console.log('@debug, content changed =', fileInfo)

            var path = contentPath + '/' + fileInfo.path
            var fileContent = fs.readFileSync(path).toString()

            /*
             特殊的标记 类似 @add: ... @
             目前处理的有: @link: @img: @add:
             如果被 ` ` 包围, 则不做处理
             */
            var rgxSpecialMark = new RegExp(
                '(^|[^`])'              // #1: avoid inline code areas
                + '@(\\w+):([^@]+)@'    // #2: action, #3: content
                ,
                'g'
            )

            // /(^|[^`])@\w:[^@]+@/g

            // var rgxBacklinks = new RegExp(
            //     '(^|[^`])'                          // #1: avoid inline code areas
            //     + '<span type="(image|link)" tag="(\\w+)">'     // #2: image or link, #3: tag string
            //     + '\\s*'
            //     + '!?\\[' + '([^\\]]*)' + '\\]'     // #4: title
            //     + '\\(' + '([^\\)]*)' + '\\)'       // #5: link (from root, good for gitlab & github)
            //     + '</span>',
            //     'g'
            // )

            var specialMarks = rgxSpecialMark.exec(fileContent)
            var backlinksOnFile = rgxBacklinks.exec(fileContent)

            for (var backLinkTag in backlinks) {
                delete backlinks[backLinkTag][tag]
            }

            var rgxBacklink = self.getBacklinkRgx()
            fileContent = fileContent.replace(rgxBacklink, function (match, type, toTag, hash, title, link) {
                self.setBacklink(toTag, tag, backlinks)

                return self.wrapBackLink(title,
                    '/' + (currentTags[toTag] || {path: '__NOT_FOUND__'}).path
                    + (hash ? '#' + hash : ''),
                    toTag, type, hash
                )
            })

            fileContent = fileContent.replace(rgxSpecialMark, function (match, _tmp, action, content) {
                // console.log('@debug, marks = ', action, content)

                content = _.trim(content)

                if (action == 'add') {
                    if (content.substr(0, 1) == '/') {
                        var targetPath = npath.resolve(contentPath + content)
                    } else {
                        var dirname = npath.dirname(path)
                        var targetPath = npath.resolve(dirname + '/' + content)
                    }

                    // console.log('@debug, target = ', targetPath)

                    if (targetPath) {
                        var targetPathInfo = utils.parsePath(targetPath)
                        if (!targetPathInfo.tag) targetPathInfo.tag = self.getTag()
                        targetPathInfo.path = self.generatePath(targetPathInfo)

                        currentTags[targetPathInfo.tag] = targetPathInfo

                        // console.log('@debug, target info = ', targetPathInfo)
                        // targetPathInfo.path =
                        // utils.ensureFile(targetPath, '')

                        self.setBacklink(targetPathInfo.tag, targetPath.tag, backlinks)

                        return self.wrapBackLink(targetPathInfo.filename,
                            '/' + currentTags[targetPathInfo.tag].path,
                            targetPathInfo.tag, 'link')
                    }
                } else if (action == 'image' || action == 'link') {
                    var result = self.searchInPath(content, currentTags)

                    if (result.mode == 'found') {
                        var fileInfo = currentTags[result.tag]
                        self.setBacklink(result.tag, tag, backlinks)

                        return self.wrapBackLink(fileInfo.filename,
                            '/' + (currentTags[result.tag] || {path: '__NOT_FOUND__'}).path
                            + (result.hash ? '#' + result.hash : ''),
                            fileInfo.tag, action, result.hash)
                    } else {
                        actionNotDone[tag] = 1
                        return match
                    }
                }
            })

            contentProcessed[tag] = 1
            // console.log('@debug, backlinks = ', backlinks, fileContent)
        }
    }
}

/*
 //
 // duplicate pages
 //     如果检测到 重复 tag, 立即停止
 //
 // new pages =>
 //     generate 全局 hash tag
 //     生成 $tag => $fileInfo 的mapping
 //     new page也会当作 contentChanged 被解析
 //
 // unknown
 //     添加 unknown
 //
 // content changed =>
 //     处理backlinks
 //     处理 @add: @link: @img:
 //         如果没能处理成功, 需要记录下来, 并设置其 mtime 为 0
 //         如果没有则标记为 now
 //     生成需要替换的 links
 //         LinksToProcess = {}
 //             // $tag1 为需要更改内容的文件
 //             $tag1: {}
 //                 // $tag2 为涉及的目标 file tag
 //                 $tag2: 1
 //
 // path changed =>
 //     查找需要替换的 links
 //         LinksToProcess
 //
 // 后续处理:
 //     利用 linksToProcess 处理所有 links
 //     利用 backlinks 和 globalTags 检测丢失的 tags, 并报错
 //         把丢失的 tags 的 path 改为 '?' 以方便后续运行检测出来问题
 //
 //
 */

var diff = unbrokenUtils.diffFiles(fileIndex, allFileInfo)

for (var tag in diff.duplicatePages) {
    console.log('[ERROR] : 发现重复页面!! 程序终止.', diff.duplicatePages)
    process.exit(1)
}

var currentTags = {}
unbrokenUtils.handleNewPages(diff.newPages, config.contentPath, currentTags, diff.contentChanged)
unbrokenUtils.handleUnknownPages(diff.unknownPages, currentTags, diff.contentChanged)
unbrokenUtils.handleContentChanged(diff.contentChanged, config.contentPath, currentTags, fileIndex.backlinks)


// console.log('@debug, all file info=', allFileInfo, diff)