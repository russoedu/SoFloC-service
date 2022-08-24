![SoFloC logo](https://raw.githubusercontent.com/russoedu/SoFloC/master/src/assets/sofloc-logo.svg)

**SoFloC** is a service to copy a Power Automate Flows from a Power Platform ***Solution***.

[![npm](https://img.shields.io/npm/v/sofloc.svg)](https://www.npmjs.com/package/sofloc)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/badges/quality-score.png?b=main)](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/?branch=main)
[![Code Coverage](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/badges/coverage.png?b=main)](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/?branch=main)
[![Build Status](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/badges/build.png?b=main)](https://scrutinizer-ci.com/g/russoedu/SoFloC-service/build-status/main)
[![Maintainability](https://api.codeclimate.com/v1/badges/8628ac39a3d8a384b8c2/maintainability)](https://codeclimate.com/github/russoedu/SoFloC-service/maintainability)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/a8431aae83fb4b57a3913b92d6f41f7a)](https://www.codacy.com/gh/russoedu/SoFloC-service/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=russoedu/SoFloC-service&amp;utm_campaign=Badge_Grade)
[![Known Vulnerabilities](https://snyk.io/test/npm/sofloc/badge.svg)](https://snyk.io/test/npm/sofloc)


## Why?

Power Platform does not provide an easy way to create a copy of a Power Automate (Flow) when it is inside a ***Solution***.
You can create a copy inside the platform, but you will never be able to add this copied Flow back to the ***Solution***.

The option you end up having is recreating the whole Flow again or doing it manually.

**SoFloC** provides an easy solution to read the files on a ***Solution*** and update the version and create copies of the specified Flows.

You can use this NPM package directly or, even better, use the [**SoFloC** desktop app](https://russoedu.github.io/SoFloC/) to copy your Flows.

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
