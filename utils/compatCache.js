const fs = require('fs')
const Cache = require('./cache.js')
const read = location => fs.readFileSync(location, 'utf-8')
const write = (location, content) => fs.writeFileSync(location, content)

/**
 * @typedef {(files: string[], option: object=) => Promise<object>} upload
 */

/**
 * @typedef {object} Cdn
 * @property {upload} upload
 */

/**
 * compatible API for cdn when enable cache
 * @param {Cdn} cdn
 * @param {object=} option
 * @param {object=} option.passToCdn passToCdn needs to be saved
 * @param {string=} option.cacheLocation where to put cache file
 * @param {function=} option.beforeUpload pre-process
 * @returns {Cdn}
 */
const compatUpload = (cdn, option = {}) => {
  // init to save option
  Cache.init(option)
  // normally beforeUpload is where compression happens
  // therefore file content needs to be updated (as side effects)
  // but only one compression per file wanted
  // so if using cache
  // compression will happen here, for upload detection
  // (whether content has been changed after compression)
  // or only before real upload, which is out of the scope of this tool
  const { beforeUpload } = option
  const runPreProcess = beforeUpload && typeof beforeUpload === 'function'
  const upload = async files => {
    const { toUpload, pairFromCache, localHashMap } = files.reduce(
      (last, file) => {
        const originContent = read(file)
        const fileContent = runPreProcess
          ? beforeUpload(originContent, file)
          : originContent
        // update content
        // @side-effects
        if (runPreProcess && originContent !== fileContent) {
          write(file, fileContent)
        }
        const locationHash = Cache.getHash(file)
        const hash = Cache.getHash(fileContent)
        if (Cache.shouldUpload(hash, locationHash)) {
          return Object.assign(last, {
            toUpload: last.toUpload.concat(file),
            localHashMap: Object.assign(last.localHashMap, {
              [file]: locationHash + hash
            })
          })
        }
        return Object.assign(last, {
          pairFromCache: Object.assign(last.pairFromCache, {
            [file]: Cache.getUrl(locationHash + hash)
          })
        })
      },
      {
        localHashMap: {},
        toUpload: [],
        pairFromCache: {}
      }
    )
    const res = toUpload.length
      ? await cdn.upload(toUpload)
      : await Promise.resolve({})
    // new pair to cache
    const newPair = Object.entries(res).reduce((_, [localPath, cdnUrl]) => {
      const hash = localHashMap[localPath]
      return Cache.update(hash, cdnUrl)
    }, {})
    // update cache
    Cache.end(newPair)
    return Object.assign(res, pairFromCache)
  }
  return {
    upload
  }
}

module.exports = compatUpload
