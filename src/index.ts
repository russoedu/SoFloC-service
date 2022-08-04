import { join } from 'path'
import { zip } from './_models/zip'
/*
 * Load zip
 * Open zip
 * Load XMLs
 *  - Flows
 *  - Version
 * Display flows
 * Select flow to be copied
 * Fill new flow name
 * Show version update
 * Save files
 * Save new Zip
 */

const path = join('files', 'SecurityReports_2_1_0_2.zip')
await zip.load(path)
console.log(`Current Solution version is :
${zip.currentVersion}`)

console.log(`Please select what Flow you want to clone:
${zip.workflows.map(wf => wf.name).join('\n')}`)

await zip.copyWorkflow('Security Reports Execution', '2.1.0.3', 'f4910f26-8210-ec11-b6e6-002248842287')

console.log('done')
