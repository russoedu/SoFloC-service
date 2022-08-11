import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { FileInput, FlowCopyT, NewSolutionT, OriginT, Xml, ZipInterface } from './types'

class Zip implements ZipInterface {
  #origin: OriginT
  #copy: FlowCopyT
  #solutionCopy: NewSolutionT

  /**
   * Loads a ***Solution*** zip file
   * @param file The ***Solution*** zip Buffer
   * @param name The file name
   */
  async load (file: FileInput, name: string) {
    try {
      const zip = await this.#getZipContent(file, name)
      const customisations = await this.#getCustomisations(JSZip)
      const solution = await this.#getSolution(JSZip)
      const { version, snakeVersion } = this.#getCurrentVersion(solution)
      const workflows = this.#getWorkflows(customisations)

      this.#origin = {
        zip,
        file,
        name,
        guid:           '',
        upperGuid:      '',
        version,
        snakeVersion,
        workflows,
        currentVersion: '',
        customisations,
        solution,
      }

      return {
        version,
        workflows: workflows.map(workflow => ({ name: workflow.name, id: workflow.id })),
      }
    } catch (error) {
      // console.log(error)
      throw new Error(`Failed to unzip '${name}'`)
    }
  }

  async getZipWithCopy (newFlowName: string, newVersion: string, originGui: string) {
    if (this.#origin.workflows.findIndex(wf => wf.id === originGui) < 0) return false

    this.#updateOrigin(originGui)
    this.#setCopyData(newFlowName, newVersion)

    this.#updateSolution()
    this.#updateCustomisations()

    return await this.#copyFile()
  }

  /**
   * Sets the origin property with the ***Solution*** zip content, file and name.
   *
   * The rest of the property is not set in this step but on other steps and upperGuid on the origin property will only be filled after a flow is selected to be copied.
   *
   * The version and snakeVersion on the origin property will only be filled after the solution XML is loaded and parsed.
   * @param file The ***Solution*** zip Buffer
   * @param name The file name
   */
  async #getZipContent (file: FileInput, name: string) {
    try {
      return await JSZip.loadAsync(file)
    } catch (error) {
      console.log(error)
      throw new Error(`Failed to unzip '${name}'`)
    }
  }

  /**
   * Sets the customisations property with the customization.xml string
   */
  async #getCustomisations (zipContents: JSZip) {
    return await this.#getXmlContentFromZip('customizations.xml', zipContents)
  }

  /**
   * Sets the solution property with the customization.xml string
   */
  async #getSolution (zipContents: JSZip) {
    return await this.#getXmlContentFromZip('solution.xml', zipContents)
  }

  /**
   * Sets the ***Solution*** current version in the origin property
   */
  #getCurrentVersion (solution: Xml) {
    try {
      const data = parser.xml2js(solution, { compact: true }) as unknown as SolutionXml

      const version = data.ImportExportXml.SolutionManifest.Version._text
      const snakeVersion = version.replace(/\./g, '_')

      return {
        version,
        snakeVersion,
      }
    } catch (error) {
      console.log(error)
      throw new Error(`Filed to retrieve the version from '${this.#origin.name}'`)
    }
  }

  /**
   * Sets the workflow object with the list of workflows found in the ***Solution*** zip
   */
  #getWorkflows (customisations: Xml) {
    const data = parser.xml2js(customisations, { compact: true }) as unknown as CustomisationsXml

    const workflowFiles = Object.entries(this.#origin.zip.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])

    return data.ImportExportXml.Workflows.Workflow
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
    const solutionComponent = `<RootComponent type="29" id="{${this.#origin.guid}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.#origin.solution.match(solutionWfRegEx)?.[0]

    if (!part) return false

    const copy = part
      .replace(this.#origin.guid, this.#copy.guid)

    this.#origin.solution = this.#origin.solution
      .replace(part, `${part}${copy}`)
      .replace(`<Version>${this.#origin.currentVersion}</Version>`, `<Version>${this.#solutionCopy.version}</Version>`)

    return true
  }

  /**
   * Copy the flow inside the Customisations XML
   * @returns False in case of an error
   */
  #updateCustomisations () {
    const customisationsComponent = `<Workflow WorkflowId="{${this.#origin.guid}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.#origin.customisations.match(customisationsWfRegEx)?.[0]

    if (!part) return false

    const JsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi

    const copy = part
      .replace(this.#origin.guid, this.#copy.guid)
      .replace(/Name=".+?"/, `Name="${this.#copy.name}"`)
      .replace(JsonFileNameRegEx, `<JsonFileName>/${this.#copy.fileName}</JsonFileName>`)

    this.#origin.customisations = this.#origin.customisations.replace(part, `${part}${copy}`)

    return true
  }

  async #copyFile (): Promise<false | {zipFile: string, name: string }> {
    const fileToCopy = this.#origin.workflows.find(wf => wf.file.name.match(this.#origin.upperGuid))

    if (!fileToCopy) return false

    fileToCopy.file.name = this.#copy.fileName
    fileToCopy.file.unsafeOriginalName = fileToCopy.name

    const zipContent = await JSZip.loadAsync(this.#origin.file as any)
    zipContent.file(fileToCopy.file.name, await fileToCopy.file.async('string'))
    zipContent.file('solution.xml', this.#origin.solution)
    zipContent.file('customizations.xml', this.#origin.customisations)

    const zipFile = await zipContent.generateAsync({
      type:               'base64',
      compression:        'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    })

    return {
      zipFile,
      name: this.#solutionCopy.name,
    }
  }

  #updateOrigin (originGui: string) {
    this.#origin.guid = originGui
    this.#origin.upperGuid = originGui.toUpperCase()
  }

  #setCopyData (newFlowName:string, newVersion: string) {
    const guid = uuidv4()
    const upperGuid = guid.toUpperCase()
    const fileName = `Workflows/${newFlowName.replace(/\s/g, '')}-${upperGuid}.json`

    this.#copy = {
      guid,
      upperGuid: guid.toUpperCase(),
      name:      newFlowName,
      fileName,
    }

    this.#solutionCopy = {
      version: newVersion,
      name:    this.#origin.name.replace(this.#origin.snakeVersion, newVersion.replace(/\./g, '_')),
    }
  }

  /**
   * Retrieves a XML from the ***Solution*** zip.
   * @param name The name of the XML to be retrieved
   * @returns The string content of the XML
   */
  async #getXmlContentFromZip (name: string, zipContents: JSZip): Promise<Xml> {
    try {
      const file = zipContents.files[name]
      const xml = await file.async('string')

      return xml
    } catch (error) {
      console.log(error)
      throw new Error(`Failed to load '${name}' from '${this.#origin.name}'`)
    }
  }
}

const zip = new Zip()
export { zip }
