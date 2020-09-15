import { read, write } from './io'
export const beforeUpload = (cdn, processFn) => {
  return {
    async upload(files) {
      if (typeof processFn === 'function') {
        await Promise.all(
          files.map(async (file) => {
            const oldContent = read(file)
            // allow async operation on file content
            const newContent = await Promise.resolve(
              processFn(oldContent, file)
            )
            if (oldContent !== newContent) write(file, newContent)
          })
        )
      }
      return cdn.upload(files)
    },
  }
}
