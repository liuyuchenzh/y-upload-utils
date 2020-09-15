import path from 'path'
import { Cache } from './cache'
import { read } from './io'

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
 * @returns {Cdn}
 */
export const compatCache = (cdn, option = {}) => {
  // init to save option
  Cache.init(option)
  const upload = async (files) => {
    const { toUpload, pairFromCache, localHashMap } = files.reduce(
      (last, file) => {
        const fileContent = read(file)
        // using relative location so cache could be shared among developers
        const relativeLocation = path.relative(__dirname, file)
        const locationHash = Cache.getHash(relativeLocation)
        const hash = Cache.getHash(fileContent)
        if (Cache.shouldUpload(hash, locationHash)) {
          return Object.assign(last, {
            toUpload: last.toUpload.concat(file),
            localHashMap: Object.assign(last.localHashMap, {
              [file]: locationHash + hash,
            }),
          })
        }
        return Object.assign(last, {
          pairFromCache: Object.assign(last.pairFromCache, {
            [file]: Cache.getUrl(locationHash + hash),
          }),
        })
      },
      {
        localHashMap: {},
        toUpload: [],
        pairFromCache: {},
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
    upload,
  }
}
