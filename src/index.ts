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

const path = 'SecurityReports_2_1_0_2.zip'
await zip.load(path)

console.log(`Please select what Flow you want to clone:
${zip.workflows.join('\n')}`)
