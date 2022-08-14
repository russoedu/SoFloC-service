import JSZip, { JSZipObject, loadAsync } from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import parser from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { Base64, FileInput, FlowCopyT, PAFloCInterface, Xml } from './types'

class PAFloC implements PAFloCInterface {
  #file: FileInput
  #zip: JSZip
  name: string
  version: string
  #workflows: { name: string, id: string, file: JSZipObject }[]
  #customisations: Xml
  #solution: Xml
  data: Base64

  /**
   * Loads a ***Solution*** zip file and make it ready to copy flows and update the version.
   * @param file The ***Solution*** zip file (base64, string, text, binarystring, array, uint8array, arraybuffer, blob or stream)
   * @param name The file name
   */
  async load (file: FileInput, name: string) {
    try {
      this.#file = file
      this.name = name

      this.#zip = await this.#getZipContent(file)
      this.#customisations = await this.#getCustomisations(this.#zip)
      this.#solution = await this.#getSolution(this.#zip)

      this.version = this.#getCurrentVersion(this.#solution)
      this.#workflows = this.#getWorkflows(this.#customisations, this.#zip)
      this.data = await this.#getData(this.#zip)
    } catch (error) {
      console.error(error)
      throw new Error(`Failed to unzip '${name}'`)
    }
  }

  /**
   * Copies a flow in the ***Solution***.
   * @param flowGuid The GUID of the flow to be copied
   * @param newFlowName The name of the copy
   * @param newVersion Optional parameter to update the ***Solution*** version. The new version must be bigger than the previous.
   */
  async copyFlow (flowGuid: string, newFlowName: string, newVersion?: string) {
    this.#wasLoaded()
    this.#worflowExists(flowGuid)

    const copyData = this.#getCopyData(newFlowName)

    if (typeof newVersion === 'string') this.updateVersion(newVersion)
    this.#updateSolution(flowGuid, copyData)
    this.#updateCustomisations(flowGuid, copyData)

    await this.#copyFile(flowGuid, copyData)
  }

  /**
   * Updates the ***Solution*** version. The new version must be bigger than the previous.
   * @param newVersion The new ***Solution*** version
   */
  async updateVersion (newVersion: string) {
    this.#wasLoaded()
    this.#validateVersion(newVersion)

    this.name = this.name
      .replace(this.#snake(this.version), this.#snake(newVersion))
    this.#solution = this.#solution
      .replace(`<Version>${this.version}</Version>`, `<Version>${newVersion}</Version>`)
    this.version = newVersion
  }

  /**
   * Retrieves the ***Solution*** zip content
   * @param file The ***Solution*** zip file (base64, string, text, binarystring, array, uint8array, arraybuffer, blob or stream)
   */
  async #getZipContent (file: FileInput) {
    try {
      return await loadAsync(file)
    } catch (error) {
      console.log(error)
      throw new Error('Failed to unzip the file')
    }
  }

  /**
   * Retrieves the customization.xml string
   * @param zip The ***Solution*** JSZip content
   */
  async #getCustomisations (zip: JSZip): Promise<Xml> {
    return await this.#getXmlContentFromZip('customizations', zip)
  }

  /**
   * Retrieves the customization.xml string
   * @param zip The ***Solution*** JSZip content
   */
  async #getSolution (zip: JSZip): Promise<Xml> {
    return await this.#getXmlContentFromZip('solution', zip)
  }

  /**
   * Retrieves the ***Solution*** current version from solution.xml
   * @param solution The solution.xml
   */
  #getCurrentVersion (solution: Xml) {
    try {
      const data = parser.xml2js(solution, { compact: true }) as unknown as SolutionXml

      return data.ImportExportXml.SolutionManifest.Version._text
    } catch (error) {
      console.log(error)
      throw new Error(`Filed to retrieve the version from '${this.name}'`)
    }
  }

  /**
   * Retrieves the list of workflows found in the ***Solution*** zip
   * @param customisations The customizations.xml
   * @param zip The ***Solution*** JSZip content
   * @returns The workflows list
   */
  #getWorkflows (customisations: Xml, zip: JSZip) {
    const data = parser.xml2js(customisations, { compact: true }) as unknown as CustomisationsXml

    const workflowFiles = Object.entries(zip.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])

    return data.ImportExportXml.Workflows.Workflow
      .map(wf => {
        const id = wf._attributes.WorkflowId.replace(/{|}/g, '')
        return {
          name: wf._attributes.Name,
          id,
          file: workflowFiles.find(file => file.name.includes(id.toUpperCase())) as JSZipObject,
        }
      })
  }

  /**
   * Retrieves the zip data
   * @param zip The ***Solution*** zip
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
   * Copies the flow inside solution.xml
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  #updateSolution (flowGuid: string, copyData: FlowCopyT) {
    const solutionComponent = `<RootComponent type="29" id="{${flowGuid}}" behavior="0" />`
    const solutionWfRegEx = new RegExp(`\r?\n?.+?${solutionComponent}`, 'gm')

    const part = this.#solution.match(solutionWfRegEx)?.[0]

    if (!part) throw new Error(`The GUID '${flowGuid}' was not found found in 'solution.xml' `)

    const copy = part
      .replace(flowGuid, copyData.guid)

    this.#solution = this.#solution
      .replace(part, `${part}${copy}`)
  }

  /**
   * Copies the flow inside the customizations.xml
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  #updateCustomisations (flowGuid: string, copyData: FlowCopyT) {
    const customisationsComponent = `<Workflow WorkflowId="{${flowGuid}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.#customisations.match(customisationsWfRegEx)?.[0]

    if (!part) throw new Error(`The GUID '${flowGuid}' was not found found in 'customizations.xml' `)

    const jsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi
    const introducedVersionRegEx = /<IntroducedVersion>(.|\r|\n)+?<\/IntroducedVersion>/gi

    const copy = part
      .replace(flowGuid, copyData.guid)
      .replace(/Name=".+?"/, `Name="${copyData.name}"`)
      .replace(jsonFileNameRegEx, `<JsonFileName>/${copyData.fileName}</JsonFileName>`)
      .replace(introducedVersionRegEx, `<IntroducedVersion>${this.version}</IntroducedVersion>`)

    this.#customisations = this.#customisations.replace(part, `${part}${copy}`)
  }

  /**
   * Copies the flow inside the ***Solution*** zip and updates data and #workflows properties
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  async #copyFile (flowGuid: string, copyData: FlowCopyT) {
    const fileToCopy = this.#workflows.find(wf => wf.id === flowGuid.toLowerCase())

    if (!fileToCopy) throw new Error('Workflow not found in the zip')

    this.#zip.file(copyData.fileName, await fileToCopy.file.async('string'))
    this.#zip.file('solution.xml', this.#solution)
    this.#zip.file('customizations.xml', this.#customisations)

    this.data = await this.#getData(this.#zip)
    this.#workflows = this.#getWorkflows(this.#customisations, this.#zip)
  }

  /**
   * Retrieves an object containing the information of the flow copy
   * @param newFlowName The name of the flow copy
   * @returns The flow copy data
   */
  #getCopyData (newFlowName:string) {
    const guid = uuidv4()
    const upperGuid = guid.toUpperCase()
    const fileName = `Workflows/${newFlowName.replace(/\s/g, '')}-${upperGuid}.json`

    return {
      guid,
      upperGuid: guid.toUpperCase(),
      name:      newFlowName,
      fileName,
    }
  }

  /**
   * Retrieves a XML from the ***Solution*** zip.
   * @param xmlName The name of the XML to be retrieved (without extension)
   * @returns The string content of the XML
   */
  async #getXmlContentFromZip (xmlName: string, zipContents: JSZip): Promise<Xml> {
    try {
      const file = zipContents.files[`${xmlName}.xml`]
      const xml = await file.async('string')

      return xml
    } catch (error) {
      console.log(error)
      throw new Error(`Failed to load '${xmlName}' from '${this.name}'`)
    }
  }

  /**
   * Verifies if a workflow exists in the ***Solution***
   */
  #worflowExists (originGuid: string) {
    if (this.#workflows.findIndex(wf => wf.id === originGuid) < 0) throw new Error(`'${originGuid}' was not found on this Solution`)
  }

  /**
   * Validates if the new version is valid
   * @param newVersion The new ***Solution*** version
   */
  #validateVersion (newVersion: string) {
    const validRegEx = /^((\d+\.)+\d+)$/
    if (!validRegEx.exec(newVersion)) {
      throw new Error(`${newVersion} is not a valid version. It should follow the format <major>.<minor>.<build>.<revision>.`)
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
   * Verifies if a ***Solution*** was loaded
   */
  #wasLoaded () {
    if (this.#file && typeof this.#file === 'undefined') throw new Error('You need to load a zip to make a copy')
  }

  get workflows () {
    this.#wasLoaded()
    return this.#workflows
      .map(workflow => ({
        name: workflow.name,
        id:   workflow.id,
      }))
  }

  /**
   * Retrieves the version replacing '.' to '_'
   * @param version The version to be converted to snake_case
   * @returns
   */
  #snake (version: string) {
    return version.replaceAll('.', '_')
  }
}

const pafloc = new PAFloC()
export { pafloc }
