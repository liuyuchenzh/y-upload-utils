import fs from 'fs'
/**
 * read files in string
 * @param {string} location
 */
export const read = (location) => fs.readFileSync(location, 'utf-8')
/**
 * write file
 * @param {string} location
 * @param {string|buffer} content
 */
export const write = (location, content) => fs.writeFileSync(location, content)
