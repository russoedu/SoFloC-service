import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { zip } from './zip'

async function main () {
  const name = 'SecurityReports_2_1_0_2.zip'
  const path = join('files', name)
  const file = readFileSync(path)

  const result = await zip.load(file, name)

  console.log(`Current Solution version is :
  ${result.version}`)

  console.log(`Please select what Flow you want to clone:
  ${result.workflows.map(wf => wf.name).join('\n')}`)

  const newFile = await zip.getZipWithCopy('Security Reports Execution', '2.1.0.3', 'f4910f26-8210-ec11-b6e6-002248842287')

  if (newFile) {
    const newPath = join('files', newFile.name)
    console.log('done')
    writeFileSync(newPath, newFile.zipFile, 'base64')
  }
}
main()
