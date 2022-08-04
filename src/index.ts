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

console.log(`Please select what Flow you want to clone:
${zip.workflows.join('\n')}`)

zip.copyWorkflow('new flow', '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2')

console.log('done');

