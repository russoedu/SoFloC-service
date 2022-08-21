# PowerAutomateFlowCopyService
Service to copy a Power Automate Flow from an exported solution

[![npm](https://img.shields.io/npm/v/font-color-contrast.svg)](https://www.npmjs.com/package/font-color-contrast)
[![CI Pipeline](https://github.com/russoedu/font-color-contrast/actions/workflows/main.yml/badge.svg)](https://github.com/russoedu/font-color-contrast/actions/workflows/main.yml)
[![Build Status](https://scrutinizer-ci.com/g/russoedu/font-color-contrast/badges/build.png?b=master)](https://scrutinizer-ci.com/g/russoedu/font-color-contrast/build-status/master)
[![Coverage Status](https://coveralls.io/repos/github/russoedu/font-color-contrast/badge.svg?branch=master)](https://coveralls.io/github/russoedu/font-color-contrast?branch=master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/russoedu/font-color-contrast/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/russoedu/font-color-contrast/?branch=master)
[![Code Climate](https://api.codeclimate.com/v1/badges/daed002166b4a0404ea5/maintainability)](https://codeclimate.com/github/russoedu/font-color-contrast/maintainability)
[![Codacy](https://app.codacy.com/project/badge/Grade/320aed91c5c5438397df48b1cc85cc8a)](https://www.codacy.com/gh/russoedu/font-color-contrast/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=russoedu/font-color-contrast&amp;utm_campaign=Badge_Grade)
[![Known Vulnerabilities](https://snyk.io/test/npm/font-color-contrast/badge.svg)](https://snyk.io/test/npm/font-color-contrast)


# Example
```
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pafloc } from './pafloc'

async function main () {
  const name = 'TestSolution_2_0_0_0.zip'
  const path = join(__dirname, '_jest', name)
  const file = readFileSync(path)

  await pafloc.load(file, name)

  console.log(`Current Solution version is: ${pafloc.version}`)

  console.log(`Please select what Flow you want to clone:
  - ${pafloc.workflows.map(wf => wf.name).join('\n  - ')}`)

  await pafloc.updateVersion('2.0.0.1')
  await pafloc.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'First Copy Flow')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Second Copy Flow')
  await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Third Copy Flow')

  const newPath = join(__dirname, pafloc.name)
  writeFileSync(newPath, pafloc.data, 'base64')
  console.log('done')
}
main()
```
