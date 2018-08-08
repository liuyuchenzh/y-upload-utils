const fs = require('fs')
/**
 * read files in string
 * @param {string} location
 */
const read = location => fs.readFileSync(location, 'utf-8')
/**
 * write file
 * @param {string} location
 * @param {string|buffer} content
 */
const write = (location, content) => fs.writeFileSync(location, content)

module.exports = {
  read,
  write
}
