const { read, write } = require('./io')
const beforeUpload = (cdn, processFn) => {
  return {
    upload(files) {
      if (typeof processFn === 'function') {
        files.forEach(file => {
          const oldContent = read(file)
          const newContent = processFn(oldContent, file)
          if (oldContent !== newContent) write(file, newContent)
        })
      }
      return cdn.upload(files)
    }
  }
}

module.exports = beforeUpload
