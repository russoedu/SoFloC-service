import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pafloc } from './pafloc'

async function main () {
  const name = 'TestSolution_2_0_0_0.zip'
  const path = join('files', name)
  const file = readFileSync(path)

  await pafloc.load(file, name)

  console.log(`Current Solution version is: ${pafloc.version}`)

  console.log(`Please select what Flow you want to clone:
  - ${pafloc.workflows.map(wf => wf.name).join('\n  - ')}`)

  await pafloc.updateVersion('2.0.0.1')
  await pafloc.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'First Copy Flow')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Second Copy Flow')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Third Copy Flow')

  const newPath = join('files', pafloc.name)
  writeFileSync(newPath, pafloc.data, 'base64')
  console.log('done')
}
main()
