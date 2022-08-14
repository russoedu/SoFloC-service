import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pafloc } from './pafloc'

async function main () {
  const name = 'SecurityReports_2_1_0_2.zip'
  const path = join('files', name)
  const file = readFileSync(path)

  await pafloc.load(file, name)

  console.log(`Current Solution version is: ${pafloc.version}`)

  console.log(`Please select what Flow you want to clone:
  - ${pafloc.workflows.map(wf => wf.name).join('\n  - ')}`)

  await pafloc.updateVersion('2.1.0.3')
  await pafloc.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'Security Reports Execution')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Security Reports Tests')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Something New')

  const newPath = join('files', pafloc.name)
  writeFileSync(newPath, pafloc.data, 'base64')
  console.log('done')
}
main()
