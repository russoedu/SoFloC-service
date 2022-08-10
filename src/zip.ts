import JSZip, { JSZipObject } from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { FlowCopyT, NewSolutionT, OriginT, Workflow, Xml, ZipInterface } from './types'

/*
 * const parsingOptions: ({ object: true } & parser) = {
 *   reversible: true,
 *   coerce:     true,
 *   sanitize:   false,
 *   trim:       true,
 *   object:     true,
 * }
 */

class Zip implements ZipInterface {
  workflows: Workflow[]
  customisations: Xml
  solution: Xml
  currentVersion: string
  workflowFiles: JSZipObject[]
  origin: OriginT
  copy: FlowCopyT
  solutionCopy: NewSolutionT

  async load (file: Buffer, name: string) {
    await this.#setOrigin(file, name)
    await this.#setCustomisations()
    await this.#setSolution()

    this.#setCurrentVersion()
    this.#setWorkflowFiles()

    this.#setWorkflows()
  }

  async getZipWithCopy (newFlowName: string, newVersion: string, originGui: string) {
    if (this.workflows.findIndex(wf => wf.id === originGui) < 0) return false

    this.#updateOrigin(originGui)
    this.#setCopyData(newFlowName, newVersion)

    this.#updateSolution()
    this.#updateCustomisations()

    return await this.#copyFile()
  }

  /**
   * Copy the flow inside the Solution XML
   * @returns False in case of an error
   */
  #updateSolution () {
    const solutionComponent = `<RootComponent type="29" id="{${this.origin.guid}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.solution.match(solutionWfRegEx)?.[0]

    if (!part) return false

    const copy = part
      .replace(this.origin.guid, this.copy.guid)

    this.solution = this.solution
      .replace(part, `${part}${copy}`)
      .replace(`<Version>${this.currentVersion}</Version>`, `<Version>${this.solutionCopy.version}</Version>`)

    return true
  }

  /**
   * Copy the flow inside the Customisations XML
   * @returns False in case of an error
   */
  #updateCustomisations () {
    const customisationsComponent = `<Workflow WorkflowId="{${this.origin.guid}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.customisations.match(customisationsWfRegEx)?.[0]

    if (!part) return false

    const JsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi

    const copy = part
      .replace(this.origin.guid, this.copy.guid)
      .replace(/Name=".+?"/, `Name="${this.copy.name}"`)
      .replace(JsonFileNameRegEx, `<JsonFileName>/${this.copy.fileName}</JsonFileName>`)

    this.customisations = this.customisations.replace(part, `${part}${copy}`)

    return true
  }

  async #copyFile (): Promise<false | {zipFile: string, name: string }> {
    // const currentSnakeVersion = this.currentVersion.replace(/\./g, '_')
    const fileToCopy = this.workflowFiles.find(file => file.name.match(this.origin.upperGuid))

    if (!fileToCopy) return false

    fileToCopy.name = this.copy.fileName
    fileToCopy.unsafeOriginalName = fileToCopy.name

    const zipContent = await JSZip.loadAsync(this.origin.file)
    zipContent.file(fileToCopy.name, await fileToCopy.async('string'))
    zipContent.file('solution.xml', this.solution)
    zipContent.file('customizations.xml', this.customisations)

    const zipFile = await zipContent.generateAsync({
      type:               'base64',
      compression:        'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    })

    return {
      zipFile,
      name: this.solutionCopy.name,
    }
  }

  async #setCustomisations () {
    this.customisations = await this.#getXml('customizations')
  }

  async #setSolution () {
    this.solution = await this.#getXml('solution')
  }

  async #getXml (name: string): Promise<Xml> {
    const file = this.origin.files[`${name}.xml`]
    const xml = await file.async('string')

    return xml
  }

  #setWorkflowFiles () {
    this.workflowFiles = Object.entries(this.origin.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])
  }

  #setCurrentVersion () {
    const data = parser.xml2js(this.solution, { compact: true }) as unknown as SolutionXml

    this.origin.version = data.ImportExportXml.SolutionManifest.Version._text
    this.origin.snakeVersion = this.origin.version.replace(/\./g, '_')
  }

  #setWorkflows () {
    const data = parser.xml2js(this.customisations, { compact: true }) as unknown as CustomisationsXml

    this.workflows = data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf._attributes.WorkflowId.replace(/{|}/g, '')
        return {
          name:      wf._attributes.Name,
          id,
          fileIndex: this.workflowFiles.findIndex(wf => wf.name.includes(id.toUpperCase())),
        }
      })
  }

  async #setOrigin (file: Buffer, name: string) {
    const zip = await JSZip.loadAsync(file)
    this.origin = {
      guid:         '',
      upperGuid:    '',
      file,
      name,
      zip,
      files:        zip.files,
      version:      '',
      snakeVersion: '',
    }
  }

  #updateOrigin (originGui: string) {
    this.origin.guid = originGui
    this.origin.upperGuid = originGui.toUpperCase()
  }

  #setCopyData (newFlowName:string, newVersion: string) {
    const guid = uuidv4()
    const upperGuid = guid.toUpperCase()
    const fileName = `Workflows/${newFlowName.replace(/\s/g, '')}-${upperGuid}.json`

    this.copy = {
      guid,
      upperGuid: guid.toUpperCase(),
      name:      newFlowName,
      fileName,
    }

    this.solutionCopy = {
      version: newVersion,
      name:    this.origin.name.replace(this.origin.snakeVersion, newVersion.replace(/\./g, '_')),
    }
  }
}

const zip = new Zip()
export { zip }
