import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { zip } from './zip'

async function main () {
  const name = 'SecurityReports_2_1_0_2.zip'
  const path = join('files', name)
  const file = readFileSync(path)

  await zip.load(file, name)

  console.log(`Current Solution version is: ${zip.version}`)

  console.log(`Please select what Flow you want to clone:
  - ${zip.workflows.map(wf => wf.name).join('\n  - ')}`)

  await zip.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'Security Reports Execution', '2.1.0.3')

  const newPath = join('files', zip.name)
  writeFileSync(newPath, zip.data, 'base64')
  console.log('done')
}
main()
