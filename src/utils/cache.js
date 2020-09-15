import path from 'path'
import fse from 'fs-extra'
import md5 from 'md5'
import { write, read as readFile } from './io'
// tricky part
// everything refer to this object
const trivialCache = {}
const OPTION_KEY = 'passToCdn'
const LAST_OPTION_KEY = 'lastPassToCdn'
const LOCATION_KEY = 'location'
const CACHE_KEY = 'cache'

/**
 * save things to trivialCache
 * @param {string} key
 * @param {*} value
 */
const save = (key, value) => {
  trivialCache[key] = value
  return trivialCache
}

/**
 * get value from trivialCache
 * @param {string} key
 */
const read = (key) => trivialCache[key]

const updateCache = (key, cdnUrl) => {
  const cache = read(CACHE_KEY)
  cache[key] = cdnUrl
  return cache
}
/**
 * get hash for file
 * @param {string} fileContent
 * @returns {string}
 */
const getHash = md5

/**
 * update cache file
 * @param {string|object} input
 * @returns {void}
 */
const updateCacheFile = (input = {}) => {
  const inputObj = typeof input === 'string' ? JSON.parse(input) : input
  const cache = read(CACHE_KEY)
  const location = read(LOCATION_KEY)
  const toSave = Object.assign(cache, inputObj)
  write(location, JSON.stringify(toSave))
}

/**
 * whether has a record
 * if the option (passToCdn) has changed
 * consider as there is no valid record
 * @param {string} hash
 * @param {string} locationHash
 * @returns {boolean}
 */
const shouldUseCache = (hash, locationHash) => {
  const oldOption = read(LAST_OPTION_KEY)
  const newOption = read(OPTION_KEY)
  const cache = read(CACHE_KEY)
  const key = Object.keys(cache).find(findContent(hash))
  const sameOption = JSON.stringify(oldOption) === JSON.stringify(newOption)
  const useCache =
    sameOption && !!key && cache[key] && typeof cache[key] === 'string'
  const contentSameButLocChanged = useCache && key.indexOf(locationHash) !== 0
  // try to delete old entry with location when it is new content
  if (!useCache) {
    tryDeleteOldEntry(hash, 'content')
    tryDeleteOldEntry(locationHash, 'location')
  } else if (contentSameButLocChanged) {
    updateCache(locationHash + hash, cache[key])
    tryDeleteOldEntry(hash, 'content')
  }
  return useCache
}

/**
 * find key from cache based on location hash
 * @param {string} locationHash
 * @return {(key: string) => *}
 */
const findLocation = (locationHash) => (k) => k.indexOf(locationHash) === 0
/**
 * find key from cache based on content hash
 * @param {string} hash
 * @return {(key: string) => *}
 */
const findContent = (hash) => (k) => k.slice(0 - hash.length) === hash

/**
 * delete entry in cache
 * avoid giant cache
 * @param {string} hash
 * @param {string=} mode
 * @returns {void}
 */
const tryDeleteOldEntry = (hash, mode) => {
  const cache = read(CACHE_KEY)
  const keys = Object.keys(cache)
  let key
  switch (mode) {
    case 'location':
      key = keys.find(findLocation(hash))
      break
    case 'content':
    default:
      key = keys.find(findContent(hash))
  }
  if (key) {
    delete cache[key]
  }
}

/**
 * save to cache
 * @param {string} key
 * @param {*} value
 * @returns {object}
 */
const saveToCache = (key, value) => {
  const cache = read(CACHE_KEY)
  cache[key] = value
  return cache
}

/**
 * read from cache
 * @param {string} key
 * @returns {*}
 */
const readFromCache = (key) => {
  const cache = read(CACHE_KEY)
  return cache[key]
}

/**
 * save configs and initiate triviaCache
 * @param {object=} option
 * @param {object=} option.passToCdn
 * @param {string=} option.cacheLocation
 * @returns {void}
 */
const init = (option = {}) => {
  const {
    passToCdn = {},
    cacheLocation = path.resolve(__dirname, '../cache.json'),
  } = option
  const location = path.join(
    cacheLocation.replace(/cache\.json$/, ''),
    '/cache.json'
  )
  save(LOCATION_KEY, location)
  fse.ensureFileSync(location)
  const cacheRaw = readFile(location).trim() || '{}'
  const cacheObj = JSON.parse(cacheRaw)
  save(CACHE_KEY, cacheObj)
  save(OPTION_KEY, passToCdn)
  const lastPassToCdn = cacheObj[OPTION_KEY]
  save(LAST_OPTION_KEY, lastPassToCdn)
  saveToCache(OPTION_KEY, passToCdn)
}

export const Cache = {
  update: updateCache,
  end: updateCacheFile,
  shouldUpload: (hash, locationHash) => !shouldUseCache(hash, locationHash),
  getUrl: readFromCache,
  getHash,
  init,
}
