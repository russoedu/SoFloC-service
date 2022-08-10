import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { FlowCopyT, NewSolutionT, OriginT, Workflow, Xml, ZipInterface } from './types'

class Zip implements ZipInterface {
  workflows: Workflow[]
  customisations: Xml
  solution: Xml
  currentVersion: string
  origin: OriginT
  copy: FlowCopyT
  solutionCopy: NewSolutionT

  /**
   * Loads a ***Solution*** zip file
   * @param file The ***Solution*** zip Buffer
   * @param name The file name
   */
  async load (file: Buffer, name: string) {
    await this.#setOrigin(file, name)
    await this.#setCustomisations()
    await this.#setSolution()

    this.#setCurrentVersion()
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
   * Sets the origin object with information about the ***Solution***.
   *
   * The guid and upperGuid on the origin object will only be filled after a flow is selected to be copied.
   *
   * The version and snakeVersion on the origin object will only be filled after the solution XML is loaded and parsed.
   * @param file The ***Solution*** zip Buffer
   * @param name The file name
   */
  async #setOrigin (file: Buffer, name: string) {
    this.origin = {
      guid:         '',
      upperGuid:    '',
      file,
      name,
      zip:          await JSZip.loadAsync(file),
      version:      '',
      snakeVersion: '',
    }
  }

  /**
   * Sets the customisations XML with the string from the ***Solution*** zip
   */
  async #setCustomisations () {
    this.customisations = await this.#getFileFromZip('customizations.xml')
  }

  /**
   * Sets the solution XML with the string from the ***Solution*** zip
   */
  async #setSolution () {
    this.solution = await this.#getFileFromZip('solution.xml')
  }

  /**
   * Sets the ***Solution*** current version in the origin object
   */
  #setCurrentVersion () {
    const data = parser.xml2js(this.solution, { compact: true }) as unknown as SolutionXml

    this.origin.version = data.ImportExportXml.SolutionManifest.Version._text
    this.origin.snakeVersion = this.origin.version.replace(/\./g, '_')
  }

  /**
   * Sets the workflow object with the list of workflows found in the ***Solution*** zip
   */
  #setWorkflows () {
    const data = parser.xml2js(this.customisations, { compact: true }) as unknown as CustomisationsXml

    const workflowFiles = Object.entries(this.origin.zip.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])

    this.workflows = data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf._attributes.WorkflowId.replace(/{|}/g, '')
        return {
          name: wf._attributes.Name,
          id,
          file: workflowFiles.find(wf => wf.name.includes(id.toUpperCase())) as JSZip.JSZipObject,
        }
      })
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
    const fileToCopy = this.workflows.find(wf => wf.file.name.match(this.origin.upperGuid))

    if (!fileToCopy) return false

    fileToCopy.file.name = this.copy.fileName
    fileToCopy.file.unsafeOriginalName = fileToCopy.name

    const zipContent = await JSZip.loadAsync(this.origin.file)
    zipContent.file(fileToCopy.file.name, await fileToCopy.file.async('string'))
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

  /**
   * Retrieves a file from the ***Solution*** zip.
   * @param name The name of the file to be retrieved
   * @returns The string content of the file
   */
  async #getFileFromZip (name: string): Promise<string> {
    const file = this.origin.zip.files[name]
    const xml = await file.async('string')

    return xml
  }
}

const zip = new Zip()
export { zip }
