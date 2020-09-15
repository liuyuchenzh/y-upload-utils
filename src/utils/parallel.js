const LIMIT = 10

/**
 * slice array based on given limit
 * @param {number} limit
 * @returns {(files: string[]) => string[]}
 */
const slice = (limit) => (files) =>
  files.reduce((last, item, index) => {
    const i = Math.floor(index / limit)
    if (!last[i]) last[i] = []
    last[i].push(item)
    return last
  }, [])

/**
 * @typedef {(files: string[], option: object=) => Promise<object>} upload
 */

/**
 * @typedef {object} Cdn
 * @property {upload} upload
 */

/**
 * @param {Cdn} cdn
 * @param {object=} option
 * @param {number=} option.sliceLimit slice limit
 * @returns {Cdn}
 */
export const parallel = (cdn, option = {}) => {
  const { sliceLimit = LIMIT } = option
  const sliceFn = slice(sliceLimit)
  const parallelCdn = {
    upload: async (files) => {
      const res = await Promise.all(
        sliceFn(files).map((chunk) => cdn.upload(chunk))
      )
      return res.reduce((last, chunkRes) => {
        return Object.assign(last, chunkRes)
      }, {})
    },
  }
  return parallelCdn
}
