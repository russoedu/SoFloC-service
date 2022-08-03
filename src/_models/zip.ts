/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync, writeFileSync } from 'fs'
import JSZip, { JSZipObject } from 'jszip'
import parser from 'xml2json'
import { CustomisationsT, Workflow, Xml } from '../_helpers/types'
import libxmljs from 'libxmljs'
import { v4 as uuidv4 } from 'uuid'
import { join } from 'path'
import { JSDOM } from 'jsdom'

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

  copyWorkflow (newName: string, workflowId: string) {
    if (this.workflows.findIndex(wf => wf.id === workflowId) < 0) return false

    const guid = uuidv4()
    const solutionComponent = `<RootComponent type="29" id="{${workflowId}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    // Copy on solution
    const part = this.solution.match(solutionWfRegEx)?.[0]
    if (!part) return false
    const solutionCopy = part.replace(workflowId, guid)
    this.solution = this.solution.replace(part, `${part}${solutionCopy}`)

    writeFileSync(join('files', 'solution2' + '.xml'), this.solution)


    // this.solution.xml.replace(part, part + )

    // Copy on customisations

    // Copy File

    console.log('xxx');

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
}

const zip = new Zip()
export { zip }
