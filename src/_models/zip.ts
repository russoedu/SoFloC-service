/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync, writeFileSync } from 'fs'
import JSZip, { JSZipObject } from 'jszip'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml2json'
import { CopyDataT, CustomisationsT, Workflow, Xml } from '../_helpers/types'

class Zip {
  /**
   * List with the name of the workflows
   */
  workflows: Workflow[]
  /**
   * The customisations file
   */
  customisations: Xml
  /**
   * The solution file
   */
  solution: Xml
  /**
   * List of workflow files
   */
  workflowFiles: JSZipObject[]

  copyData: CopyDataT

  /**
   * All files inside the Zip
   */
  files: { [key: string]: JSZip.JSZipObject }

  async load (path: string) {
    this.files = await this.#getZipFiles(path)

    this.customisations = await this.#getXml('customizations')
    this.solution = await this.#getXml('solution')

    this.workflowFiles = this.#getWorkflowFiles()

    this.workflows = this.#getWorkflows()
  }

  copyWorkflow (newName: string, originGui: string) {
    if (this.workflows.findIndex(wf => wf.id === originGui) < 0) return false

    this.#setCopyData(newName, originGui)

    this.#copyOnSolution()
    this.#copyCustomisations()

    writeFileSync(join('files', 'solution2' + '.xml'), this.solution)
    writeFileSync(join('files', 'customisations2' + '.xml'), this.customisations)

    // Copy File

    console.log('xxx')
  }

  #copyCustomisations () {
    const customisationsComponent = `<Workflow WorkflowId="{${this.copyData.originGui}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.customisations.match(customisationsWfRegEx)?.[0]

    if (!part) return false

    const JsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi

    const copy = part
      .replace(this.copyData.originGui, this.copyData.guid)
      .replace(/Name=".+?"/, `Name="${this.copyData.name}"`)
      .replace(JsonFileNameRegEx, `<JsonFileName>/Workflows/${this.copyData.fileName}-${this.copyData.upperGuid}.json</JsonFileName>`)

    this.customisations = this.customisations.replace(part, `${part}${copy}`)

    // TODO replace name

    // TODO replace <JsonFileName>/Workflows/ManualExecution-0F48CBA9-EF0C-ED11-82E4-000D3A64F6F2.json</JsonFileName>
  }

  #copyOnSolution () {
    const solutionComponent = `<RootComponent type="29" id="{${this.copyData.originGui}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.solution.match(solutionWfRegEx)?.[0]

    if (!part) return false

    const copy = part.replace(this.copyData.originGui, this.copyData.guid)

    this.solution = this.solution.replace(part, `${part}${copy}`)
  }

  async #getZipFiles (path: string) {
    const file = readFileSync(path)
    const zipContent = await JSZip.loadAsync(file)

    return zipContent.files
  }

  async #getXml (name: string): Promise<Xml> {
    const file = this.files[`${name}.xml`]
    const xml = await file.async('string')

    writeFileSync(join('files', name + '.xml'), xml)
    return xml
  }

  #getWorkflowFiles () {
    return Object.entries(this.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])
  }

  #getWorkflows () {
    const parsingOptions: ({ object: true } & parser.JsonOptions) = {
      reversible: true,
      coerce:     true,
      sanitize:   false,
      trim:       true,
      object:     true,
    }
    const data = parser.toJson(this.customisations, parsingOptions) as unknown as CustomisationsT

    return data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf.WorkflowId.replace(/{|}/g, '')
        return {
          name:      wf.Name,
          id,
          fileIndex: this.workflowFiles.findIndex(wf => wf.name.includes(id)),
        }
      })
  }

  #setCopyData (newName:string, originGui: string) {
    const guid = uuidv4()
    this.copyData = {
      originGui,
      guid,
      upperGuid: guid.toUpperCase(),
      name:      newName,
      fileName:  newName.replace(/\s/g, ''),
    }
  }
}

const zip = new Zip()
export { zip }
