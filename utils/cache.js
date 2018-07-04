const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const md5 = require('md5')
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
const read = key => trivialCache[key]

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
  fs.writeFileSync(location, JSON.stringify(toSave))
}

/**
 * whether has a record
 * if the option (passToCdn) has changed
 * consider as there is no valid record
 * @param {string} key
 * @returns {boolean}
 */
const shouldUseCache = key => {
  const oldOption = read(LAST_OPTION_KEY)
  const newOption = read(OPTION_KEY)
  const cache = read(CACHE_KEY)
  const sameOption = JSON.stringify(oldOption) === JSON.stringify(newOption)
  return (
    sameOption && key in cache && cache[key] && typeof cache[key] === 'string'
  )
}

const saveToCache = (key, value) => {
  const cache = read(CACHE_KEY)
  cache[key] = value
  return cache
}

const readFromCache = key => {
  const cache = read(CACHE_KEY)
  return cache[key]
}

/**
 * to accurately get the new option (passToCdn)
 * needs to invoke this function after saveOption
 * @param {object=} obj
 * @returns {*}
 */
const getOption = (obj = cacheObj) => obj[OPTION_KEY]

/**
 * save configs and initiate triviaCache
 * @param {object=} option
 * @param {object=} option.passToCdn
 * @param {string=} option.cacheLocation
 */
const init = (option = {}) => {
  const {
    passToCdn = {},
    cacheLocation = path.resolve(__dirname, '../cache.json')
  } = option
  const location = path.join(
    cacheLocation.replace(/cache\.json$/, ''),
    '/cache.json'
  )
  save(LOCATION_KEY, location)
  fse.ensureFileSync(location)
  const cacheRaw = fs.readFileSync(location, 'utf-8').trim() || '{}'
  const cacheObj = JSON.parse(cacheRaw)
  save(CACHE_KEY, cacheObj)
  save(OPTION_KEY, passToCdn)
  const lastPassToCdn = cacheObj[OPTION_KEY]
  save(LAST_OPTION_KEY, lastPassToCdn)
  saveToCache(OPTION_KEY, passToCdn)
}

const Cache = {
  update: updateCache,
  end: updateCacheFile,
  shouldUpload: key => !shouldUseCache(key),
  getUrl: readFromCache,
  getHash,
  init
}

module.exports = Cache
