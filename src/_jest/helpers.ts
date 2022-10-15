import JSZip from 'jszip'

export function zipBack (zip: JSZip) {
  return zip.generateAsync({
    type:               'base64',
    compression:        'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  })
}

export function cleanLineBreak (content: string) {
  return content.replace(/\r\n/gm, '\n')
}
