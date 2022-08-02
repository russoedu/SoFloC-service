/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync } from 'fs'
import JSZip, { JSZipObject } from 'jszip'
import parser from 'xml2json'
import { Workflow, XmlCustomisationsT, XmlSolutionT } from '../_helpers/types'
import { DOMParser } from 'xmldom'

class Zip {
  /**
   * List with the name of the workflows
   */
  workflows: Workflow[]
  /**
   * The customisations file
   */
  #customisations: XmlCustomisationsT
  /**
   * The solution file
   */
  #solution: XmlSolutionT
  /**
   * List of workflow files
   */
  #workflowFiles: JSZipObject[]

  /**
   * All files inside the Zip
   */
  #files: { [key: string]: JSZip.JSZipObject }

  async load (path: string) {
    this.#files = await this.#getZipFiles(path)

    this.#customisations = await this.#getXml('customizations')
    this.#solution = await this.#getXml('solution')

    this.#workflowFiles = this.#getWorkflowFiles()

    this.workflows = this.#getWorkflows()
  }

  async copyWorkflow (workflowId: string) {
    if (this.workflows.findIndex(wf => wf.id === workflowId) < 0) return false
    // Copy on solution

    // Copy on customisations

    // Copy File
  }

  async #getZipFiles (path: string) {
    const file = readFileSync(path)
    const zipContent = await JSZip.loadAsync(file)

    return zipContent.files
  }

  async #getXml <T extends 'customizations'|'solution'> (name: T): Promise<T extends 'customizations' ? XmlCustomisationsT : XmlSolutionT> {
    const parsingOptions: ({ object: true } & parser.JsonOptions) = {
      reversible: true,
      coerce:     true,
      sanitize:   false,
      trim:       true,
      object:     true,
    }

    const file = this.#files[`${name}.xml`]
    const xml = await file.async('string')
    const data = parser.toJson(xml, parsingOptions)
    return {
      xml, // TODO maybe not needed
      data: data as any,
      node: new DOMParser().parseFromString(xml)
    }
  }

  #getWorkflowFiles () {
    return Object.entries(this.#files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])
  }

  #getWorkflows () {
    return this.#customisations.data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf.WorkflowId.replace(/{|}/g, '').toUpperCase()
        return {
          name:      wf.Name,
          id,
          fileIndex: this.#workflowFiles.findIndex(wf => wf.name.includes(id)),
        }
      })
  }
}

const zip = new Zip()
export { zip }
