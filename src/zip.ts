import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { FileInput, FlowDataT, FileDataT, Xml, ZipInterface } from './types'

class Zip implements ZipInterface {
  file: FileDataT
  #flowCopyData: FlowDataT

  /**
   * Loads a ***Solution*** zip file
   * @param file The ***Solution*** zip file (base64, string, text, binarystring, array, uint8array, arraybuffer, blob or stream)
   * @param name The file name
   */
  async load (file: FileInput, name: string) {
    try {
      const zip = await this.#getZipContent(file)
      const customisations = await this.#getCustomisations(zip)
      const solution = await this.#getSolution(zip)
      const version = this.#getCurrentVersion(solution)
      const workflows = this.#getWorkflows(customisations, zip)
      const data = await this.#getData(zip)

      this.file = {
        zip,
        file,
        name,
        version,
        workflows,
        customisations,
        solution,
        data,
      }
    } catch (error) {
      console.error(error)
      throw new Error(`Failed to unzip '${name}'`)
    }
  }

  async copyFlow (originGuid: string, newFlowName: string, newVersion?: string) {
    this.#wasLoaded()
    this.#worflowExists(originGuid)

    this.#setCopyData(newFlowName)

    if (typeof newVersion === 'string') this.updateVersion(newVersion)
    this.#updateSolution(originGuid)
    this.#updateCustomisations(originGuid)

    await this.#copyFile(originGuid)
  }

  /**
   * Updates the version in the file property and inside the solutions XML
   * @param newVersion The new **Solution** version
   */
  async updateVersion (newVersion: string) {
    this.#wasLoaded()
    this.#validateVersion(newVersion)

    this.file.name = this.file.name
      .replace(this.#snake(this.file.version), this.#snake(newVersion))
    this.file.solution = this.file.solution
      .replace(`<Version>${this.file.version}</Version>`, `<Version>${newVersion}</Version>`)
    this.file.version = newVersion
  }

  /**
   * Retrieves the ***Solution*** zip content
   * @param file The ***Solution*** zip Buffer
   */
  async #getZipContent (file: FileInput) {
    try {
      return await JSZip.loadAsync(file)
    } catch (error) {
      console.log(error)
      throw new Error('Failed to unzip the file')
    }
  }

  /**
   * Retrieves the customisations property with the customization.xml string
   */
  async #getCustomisations (zipContents: JSZip) {
    return await this.#getXmlContentFromZip('customizations.xml', zipContents)
  }

  /**
   * Retrieves the solution property with the customization.xml string
   */
  async #getSolution (zipContents: JSZip) {
    return await this.#getXmlContentFromZip('solution.xml', zipContents)
  }

  /**
   * Retrieves the ***Solution*** current version in the origin property
   */
  #getCurrentVersion (solution: Xml) {
    try {
      const data = parser.xml2js(solution, { compact: true }) as unknown as SolutionXml

      return data.ImportExportXml.SolutionManifest.Version._text
    } catch (error) {
      console.log(error)
      throw new Error(`Filed to retrieve the version from '${this.file.name}'`)
    }
  }

  /**
   * Sets the workflow object with the list of workflows found in the ***Solution*** zip
   */
  #getWorkflows (customisations: Xml, zipContents: JSZip) {
    const data = parser.xml2js(customisations, { compact: true }) as unknown as CustomisationsXml

    const workflowFiles = Object.entries(zipContents.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])

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
   * Retrieves the zip data
   * @param zip The **Solution** zip
   * @returns The generated base64 zip
   */
  async #getData (zip: JSZip) {
    return await zip.generateAsync({
      type:               'base64',
      compression:        'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    })
  }

  /**
   * Copy the flow inside the Solution XML
   * @returns False in case of an error
   */
  #updateSolution (originGuid: string) {
    const solutionComponent = `<RootComponent type="29" id="{${originGuid}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.file.solution.match(solutionWfRegEx)?.[0]

    if (!part) return false

    const copy = part
      .replace(originGuid, this.#flowCopyData.guid)

    this.file.solution = this.file.solution
      .replace(part, `${part}${copy}`)

    return true
  }

  /**
   * Copy the flow inside the Customisations XML
   * @returns False in case of an error
   */
  #updateCustomisations (originGuid: string) {
    const customisationsComponent = `<Workflow WorkflowId="{${originGuid}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.file.customisations.match(customisationsWfRegEx)?.[0]

    if (!part) return false

    const JsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi

    const copy = part
      .replace(originGuid, this.#flowCopyData.guid)
      .replace(/Name=".+?"/, `Name="${this.#flowCopyData.name}"`)
      .replace(JsonFileNameRegEx, `<JsonFileName>/${this.#flowCopyData.fileName}</JsonFileName>`)

    this.file.customisations = this.file.customisations.replace(part, `${part}${copy}`)

    return true
  }

  async #copyFile (originGuid: string) {
    const fileToCopy = this.file.workflows.find(wf => wf.file.name.match(originGuid.toUpperCase()))

    if (!fileToCopy) return false

    fileToCopy.file.name = this.#flowCopyData.fileName
    fileToCopy.file.unsafeOriginalName = fileToCopy.name

    // const zipContent = await JSZip.loadAsync(this.#file.file as any)
    this.file.zip.file(fileToCopy.file.name, await fileToCopy.file.async('string'))
    this.file.zip.file('solution.xml', this.file.solution)
    this.file.zip.file('customizations.xml', this.file.customisations)
    this.file.data = await this.#getData(this.file.zip)
  }

  #setCopyData (newFlowName:string) {
    const guid = uuidv4()
    const upperGuid = guid.toUpperCase()
    const fileName = `Workflows/${newFlowName.replace(/\s/g, '')}-${upperGuid}.json`

    this.#flowCopyData = {
      guid,
      upperGuid: guid.toUpperCase(),
      name:      newFlowName,
      fileName,
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
      throw new Error(`Failed to load '${name}' from '${this.file.name}'`)
    }
  }

  /**
   * Verifies if a workflow exists in the solution
   */
  #worflowExists (originGuid: string) {
    if (this.file.workflows.findIndex(wf => wf.id === originGuid) < 0) throw new Error(`'${originGuid}' was not found on this Solution`)
  }

  /**
   * Validates if the new version is valid, Throws an error in case it's not valid
   * @param newVersion The new **Solution** version
   */
  #validateVersion (newVersion: string) {
    const validRegEx = /^((\d+\.)+\d+)$/
    if (!validRegEx.exec(newVersion)) {
      throw new Error(`${newVersion} is not a valid version`)
    }

    const currentVersionValues = this.version.split('.').map(value => Number(value))
    const newVersionValues = newVersion.split('.').map(value => Number(value))

    let isValid = false
    for (let i = 0; i < currentVersionValues.length; i++) {
      const currentValue = currentVersionValues[i]
      const newValue = newVersionValues[i]
      if (typeof newValue === 'undefined') {
        break
      } else if (newValue > currentValue) {
        isValid = true
        break
      }
    }
    if (!isValid) {
      throw new Error(`${newVersion} is smaller than ${this.version}`)
    }
  }

  /**
   * Verifies if a file was loaded
   */
  #wasLoaded () {
    if (this.file && typeof this.file.file === 'undefined') throw new Error('You need to load a zip to make a copy')
  }

  get name () {
    this.#wasLoaded()
    return this.file.name
  }

  get data () {
    this.#wasLoaded()
    return this.file.data
  }

  /**
   * The current version of the **Solution**
   */
  get version () {
    this.#wasLoaded()
    return this.file.version
  }

  /**
   * The workflows found in the **Solution**
   */
  get workflows () {
    this.#wasLoaded()
    return this.file.workflows
      .map(workflow => ({
        name: workflow.name,
        id:   workflow.id,
      }))
  }

  #snake (text: string) {
    return text.replaceAll('.', '_')
  }

  #upper (text:string) {
    return text.toUpperCase()
  }
}

const zip = new Zip()
export { zip }
