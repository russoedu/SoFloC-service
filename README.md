# PowerAutomateFlowCopyService

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/d6f71e7bff474bbaa3e5f44db2cd44c5)](https://app.codacy.com/gh/russoedu/SoFloC-service?utm_source=github.com&utm_medium=referral&utm_content=russoedu/SoFloC-service&utm_campaign=Badge_Grade_Settings)

Service to copy a Power Automate Flow from an exported solution

# Example
```
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { SoFloC } from './SoFloC'

async function main () {
  const name = 'TestSolution_2_0_0_0.zip'
  const path = join(__dirname, '_jest', name)
  const file = readFileSync(path)

  const soFloC = new SoFloC(file, name)

  console.log(`Current Solution version is: ${soFloC.version}`)

  console.log(`Please select what Flow you want to clone:
  - ${soFloC.workflows.map(wf => wf.name).join('\n  - ')}`)

  await soFloC.updateVersion('2.0.0.1')
  await soFloC.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'First Copy Flow')
  await soFloC.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Second Copy Flow')
  await soFloC.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Third Copy Flow')

  const newPath = join(__dirname, soFloC.name)
  writeFileSync(newPath, soFloC.data, 'base64')
  console.log('done')
}
main()
```
