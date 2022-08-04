/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync, writeFileSync } from 'fs'
import JSZip, { JSZipObject } from 'jszip'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml2json'
import { CopyT, CustomisationsT, SolutionT, Workflow, Xml } from '../_helpers/types'

const parsingOptions: ({ object: true } & parser.JsonOptions) = {
  reversible: true,
  coerce:     true,
  sanitize:   false,
  trim:       true,
  object:     true,
}

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
   * The current version of the solution
   */
  currentVersion: string
  /**
   * List of workflow files
   */
  workflowFiles: JSZipObject[]

  copy: CopyT

  originalZipPath: string
  newFilePath: string

  /**
   * All files inside the Zip
   */
  files: { [key: string]: JSZip.JSZipObject }

  async load (path: string) {
    this.originalZipPath = path
    await this.#setZipFiles()
    await this.#setCustomisations()
    await this.#setSolution()

    this.#setCurrentVersion()
    this.#setWorkflowFiles()

    this.#setWorkflows()
  }

  async copyWorkflow (newName: string, newVersion: string, originGui: string) {
    if (this.workflows.findIndex(wf => wf.id === originGui) < 0) return false

    this.#setCopyData(newName, originGui, newVersion)

    this.#updateSolution()
    this.#updateCustomisations()

    writeFileSync(join('files', 'solution2' + '.xml'), this.solution)
    writeFileSync(join('files', 'customisations2' + '.xml'), this.customisations)

    await this.#copyFileAndSaveNewZip()
  }

  /**
   * Copy the flow inside the Solution XML
   * @returns False in case of an error
   */
  #updateSolution () {
    const solutionComponent = `<RootComponent type="29" id="{${this.copy.originGui}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.solution.match(solutionWfRegEx)?.[0]

    if (!part) return false

    const copy = part
      .replace(this.copy.originGui, this.copy.guid)

    this.solution = this.solution
      .replace(part, `${part}${copy}`)
      .replace(`<Version>${this.currentVersion}</Version>`, `<Version>${this.copy.newVersion}</Version>`)
    return true
  }

  /**
   * Copy the flow inside the Customisations XML
   * @returns False in case of an error
   */
  #updateCustomisations () {
    const customisationsComponent = `<Workflow WorkflowId="{${this.copy.originGui}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.customisations.match(customisationsWfRegEx)?.[0]

    if (!part) return false

    const JsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi

    const copy = part
      .replace(this.copy.originGui, this.copy.guid)
      .replace(/Name=".+?"/, `Name="${this.copy.name}"`)
      .replace(JsonFileNameRegEx, `<JsonFileName>/Workflows/${this.copy.fileName}-${this.copy.upperGuid}.json</JsonFileName>`)

    this.customisations = this.customisations.replace(part, `${part}${copy}`)

    return true
  }

  async #copyFileAndSaveNewZip () {
    const currentSnakeVersion = this.currentVersion.replace(/\./g, '_')
    this.newFilePath = this.originalZipPath.replace(currentSnakeVersion, this.copy.newSnakeVersion)

    const fileToCopy = this.workflowFiles.find(file => file.name.match(this.copy.upperOriginGui))

    if (!fileToCopy) return false

    fileToCopy.name = `Workflows/${this.copy.fileName}-${this.copy.upperGuid}.json`
    fileToCopy.unsafeOriginalName = fileToCopy.name

    const file = readFileSync(this.originalZipPath)
    const zipContent = await JSZip.loadAsync(file)
    zipContent.file(fileToCopy.name, await fileToCopy.async('string'))
    const zipFile = await zipContent.generateAsync({
      type:               'base64',
      compression:        'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    })

    writeFileSync(this.newFilePath, zipFile, 'base64')

    return true
  }

  async #setZipFiles () {
    const file = readFileSync(this.originalZipPath)
    const zipContent = await JSZip.loadAsync(file)

    this.files = zipContent.files
  }

  async #setCustomisations () {
    this.customisations = await this.#getXml('customizations')
  }

  async #setSolution () {
    this.solution = await this.#getXml('solution')
  }

  async #getXml (name: string): Promise<Xml> {
    const file = this.files[`${name}.xml`]
    const xml = await file.async('string')

    writeFileSync(join('files', name + '.xml'), xml)
    return xml
  }

  #setWorkflowFiles () {
    this.workflowFiles = Object.entries(this.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])
  }

  #setCurrentVersion () {
    const data = parser.toJson(this.solution, parsingOptions) as unknown as SolutionT

    this.currentVersion = data.ImportExportXml.SolutionManifest.Version.$t
  }

  #setWorkflows () {
    const data = parser.toJson(this.customisations, parsingOptions) as unknown as CustomisationsT

    this.workflows = data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf.WorkflowId.replace(/{|}/g, '')
        return {
          name:      wf.Name,
          id,
          fileIndex: this.workflowFiles.findIndex(wf => wf.name.includes(id)),
        }
      })
  }

  #setCopyData (newName:string, originGui: string, newVersion: string) {
    const guid = uuidv4()
    this.copy = {
      originGui,
      upperOriginGui:  originGui.toUpperCase(),
      guid,
      upperGuid:       guid.toUpperCase(),
      name:            newName,
      fileName:        newName.replace(/\s/g, ''),
      newVersion,
      newSnakeVersion: newVersion.replace(/\./g, '_'),
    }
  }
}

const zip = new Zip()
export { zip }
