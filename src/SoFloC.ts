import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { xml2js } from 'xml-js'
import { CustomisationsXml } from './customisations'
import { SolutionXml } from './solution'
import { Base64, FileInput, FlowCopyT, PAFloCInterface, PrivateWorkflowT, WorkflowT, Xml } from './types'

export class SoFloC implements PAFloCInterface {
  /**
   * Creates a new SoFloC instance. To be able to use it you need to run `await soFloC.load()`
   * @param file The file data to be open
   * @param name The name of the file
   */
  constructor (file: FileInput, name: string) {
    this.#wasLoaded = false
    this.#file = file
    this.name = name
  }

  /**
   * Loads a ***Solution*** zip file and make it ready to get the existing flows and the version, copy flows and update the version. Sets #wasLoaded to true
   */
  async load () {
    if (!this.#wasLoaded) {
      try {
        this.#zip = await this.#unzip(this.#file)

        const [customisations, customisationsData] = await this.#getCustomisations(this.#zip)
        this.#customisations = customisations
        this.#customisationsData = customisationsData

        const [solution, solutionData] = await this.#getSolution(this.#zip)
        this.#solution = solution
        this.#solutionData = solutionData

        this.version = this.#getCurrentVersion(this.#solutionData)
        this.#workflows = this.#getWorkflows(this.#customisationsData, this.#solutionData, this.#zip)
        this.data = await this.#getData(this.#zip)

        this.#wasLoaded = true
      } catch (error) {
        if (typeof error === 'string') {
          throw new Error(error)
        }
        /* istanbul ignore next */
        throw error
      }
    }
  }

  /**
   * Copies a flow in the ***Solution***.
   * @param flowGuid The GUID of the flow to be copied
   * @param newFlowName The name of the copy
   * @param newVersion The new ***Solution*** version
   */
  async copyFlow (flowGuid: string, newFlowName: string, newVersion?: string) {
    await this.load()
    try {
      this.#worflowExists(flowGuid)

      if (newVersion) await this.updateVersion(newVersion)

      const copyData = this.#getCopyData(newFlowName)

      const [customisations, customisationsData] = this.#getUpdatedCustomisations(flowGuid, copyData)
      this.#customisations = customisations
      this.#customisationsData = customisationsData

      const [solution, solutionData] = this.#getUpdateSolution(flowGuid, copyData)
      this.#solution = solution
      this.#solutionData = solutionData

      await this.#copyFile(flowGuid, copyData)
    } catch (error) {
      if (typeof error === 'string') {
        throw new Error(error)
      }
      /* istanbul ignore next */
      throw error
    }
  }

  /**
   * Updates the ***Solution*** version. The new version must be bigger than the previous.
   * @param newVersion The new ***Solution*** version
   */
  async updateVersion (newVersion: string) {
    await this.load()
    try {
      this.#validateVersion(newVersion)

      this.name = this.name
        .replace(this.#snake(this.version), this.#snake(newVersion))
      this.#solution = this.#solution
        .replace(`<Version>${this.version}</Version>`, `<Version>${newVersion}</Version>`)
      this.version = newVersion
    } catch (error) {
      if (typeof error === 'string') {
        throw new Error(error)
      }
      /* istanbul ignore next */
      throw error
    }
  }

  /**
   * The list of workflows in the solution. To be able to get the list you need to run `await soFloC.load()` first.
   */
  get workflows () {
    if (!this.#wasLoaded) return []
    return this.#workflows.map(workflow => ({
      name: workflow.name,
      id:   workflow.id,
    })) as WorkflowT[]
  }

  /* #region LOAD METHODS */
  /**
   * Resets the loaded data
   */
  /**
   * Retrieves the ***Solution*** zip content
   * @param file The ***Solution*** zip file (base64, string, text, binarystring, array, uint8array, arraybuffer, blob or stream)
   */
  async #unzip (file: FileInput) {
    try {
      const options = typeof file === 'string'
        ? { base64: true }
        : {}
      return await JSZip.loadAsync(file, options)
    } catch (error) {
      console.log(error)
      throw 'Failed to unzip the file'
    }
  }

  /**
   * Retrieves the customization.xml string
   * @param zip The ***Solution*** JSZip content
   */
  async #getCustomisations (zip: JSZip): Promise<[Xml, CustomisationsXml]> {
    return (await this.#getXmlContentFromZip('customizations', zip)) as [Xml, CustomisationsXml]
  }

  /**
   * Retrieves the customization.xml string
   * @param zip The ***Solution*** JSZip content
   */
  async #getSolution (zip: JSZip): Promise<[Xml, SolutionXml]> {
    return (await this.#getXmlContentFromZip('solution', zip)) as [Xml, SolutionXml]
  }

  /**
   * Retrieves a XML from the ***Solution*** zip.
   * @param xmlName The name of the XML to be retrieved (without extension)
   * @returns The string content of the XML
   */
  async #getXmlContentFromZip (xmlName: string, zipContents: JSZip): Promise<[Xml, CustomisationsXml | SolutionXml]> {
    try {
      const file = zipContents.files[`${xmlName}.xml`]
      const xml = await file.async('string')
      const data = xml2js(xml, { compact: true }) as CustomisationsXml

      return [
        xml,
        data,
      ]
    } catch (error) {
      console.log(error)
      throw `'${xmlName}.xml' was not found in the Solution zip`
    }
  }

  /**
   * Retrieves the ***Solution*** current version from solution.xml
   * @param solution The solution.xml
   */
  #getCurrentVersion (solution: SolutionXml) {
    try {
      return solution.ImportExportXml.SolutionManifest.Version._text
    } catch (error) {
      console.log(error)
      throw 'Failed to retrieve the version'
    }
  }

  /**
   * Retrieves the list of workflows found in the ***Solution*** zip
   * @param customisations The customizations.xml
   * @param zip The ***Solution*** JSZip content
   * @returns The workflows list
   */
  #getWorkflows (customisations: CustomisationsXml, solution: SolutionXml, zip: JSZip) {
    const workflowFiles = Object.entries(zip.files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])

    const workflows = customisations.ImportExportXml.Workflows.Workflow
      .map(workflow => {
        const id = workflow._attributes.WorkflowId.replace(/{|}/g, '')
        const isOnSolution = solution.ImportExportXml.SolutionManifest.RootComponents.RootComponent.findIndex(wf => wf._attributes.id.includes(id)) >= 0
        const file = workflowFiles.find(workflowFile => workflowFile.name.includes(id.toUpperCase())) as JSZip.JSZipObject
        return !!file && !!id && isOnSolution
          ? {
              name: workflow._attributes.Name,
              id,
              file,
            }
          : null
      })
    return workflows.filter(workflow => workflow !== null) as PrivateWorkflowT[]
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
  /* #endregion */

  /* #region COPY FLOW METHODS */
  /**
   * Verifies if a specified workflow exists in the ***Solution***
   */
  #worflowExists (flowGuid: string) {
    if (this.#workflows.findIndex(wf => wf.id === flowGuid) < 0) throw `Workflow file with GUID '${flowGuid}' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'`
  }

  /**
   * Retrieves an object containing the information of the flow copy
   * @param newFlowName The name of the flow copy
   * @returns The flow copy data
   */
  #getCopyData (newFlowName: string) {
    const guid = randomUUID()
    const upperGuid = guid.toUpperCase()
    const fileName = `Workflows/${newFlowName.replace(/\s/g, '')}-${upperGuid}.json`

    return {
      guid,
      upperGuid,
      name: newFlowName,
      fileName,
    }
  }

  /**
   * Copies the flow inside solution.xml
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  #getUpdateSolution (flowGuid: string, copyData: FlowCopyT): [Xml, SolutionXml] {
    const rootComponent = `<RootComponent type="29" id="{${flowGuid}}" behavior="0" />`
    const rootRegEx = new RegExp(`\r?\n?.+?${rootComponent}`, 'gm')

    const part = this.#solution.match(rootRegEx)?.[0] as string

    const copy = part
      .replace(flowGuid, copyData.guid)

    const solution = this.#solution
      .replace(part, `${part}${copy}`)
    const data = xml2js(solution, { compact: true }) as SolutionXml

    return [
      solution,
      data,
    ]
  }

  /**
   * Copies the flow inside the customizations.xml
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  #getUpdatedCustomisations (flowGuid: string, copyData: FlowCopyT): [Xml, CustomisationsXml] {
    const customisationsComponent = `<Workflow WorkflowId="{${flowGuid}}" Name=".+?">(.|\r|\n)+?<\/Workflow>`
    const customisationsWfRegEx = new RegExp(`\r?\n?.+?${customisationsComponent}`, 'gm')

    const part = this.#customisations.match(customisationsWfRegEx)?.[0] as string

    const jsonFileNameRegEx = /<JsonFileName>(.|\r|\n)+?<\/JsonFileName>/gi
    const introducedVersionRegEx = /<IntroducedVersion>(.|\r|\n)+?<\/IntroducedVersion>/gi

    const copy = part
      .replace(flowGuid, copyData.guid)
      .replace(/Name=".+?"/, `Name="${copyData.name}"`)
      .replace(jsonFileNameRegEx, `<JsonFileName>/${copyData.fileName}</JsonFileName>`)
      .replace(introducedVersionRegEx, `<IntroducedVersion>${this.version}</IntroducedVersion>`)

    const customisations = this.#customisations.replace(part, `${part}${copy}`)
    const data = xml2js(customisations, { compact: true }) as CustomisationsXml

    return [
      customisations,
      data,
    ]
  }

  /**
   * Copies the flow inside the ***Solution*** zip and updates data and #workflows properties
   * @param flowGuid The GUID of the original flow to be copied
   * @param copyData The data of the flow copy
   */
  async #copyFile (flowGuid: string, copyData: FlowCopyT) {
    const fileToCopy = this.#workflows.find(wf => wf.id === flowGuid.toLowerCase()) as PrivateWorkflowT

    this.#zip.file(copyData.fileName, await fileToCopy.file.async('string'))
    this.#zip.file('solution.xml', this.#solution)
    this.#zip.file('customizations.xml', this.#customisations)

    this.data = await this.#getData(this.#zip)
    this.#workflows = this.#getWorkflows(this.#customisationsData, this.#solutionData, this.#zip)
  }
  /* #endregion */

  /* #region UPDATE VERION METHODS */
  /**
   * Validates if the new version is valid
   * @param newVersion The new ***Solution*** version
   */
  #validateVersion (newVersion: string) {
    const validRegEx = /^((\d+\.)+\d+)$/
    if (!validRegEx.exec(newVersion)) {
      throw `Version '${newVersion}' is not valid. It should follow the format <major>.<minor>.<build>.<revision>.`
    }

    const currentVersionValues = this.version.split('.').map(value => Number(value))
    const newVersionValues = newVersion.split('.').map(value => Number(value))

    let currentValueString = ''
    let newValueString = ''
    for (let i = 0; i < currentVersionValues.length; i++) {
      const currentValue = currentVersionValues[i]
      const newValue = newVersionValues[i]

      const currentValueLength = String(currentValue).length
      const newValueLength = String(newValue).length

      const maxLength = Math.max(currentValueLength, newValueLength)

      currentValueString += '0'.repeat(maxLength - currentValueLength) + String(currentValue)
      newValueString += '0'.repeat(maxLength - newValueLength) + String(newValue)
    }

    if (Number(newValueString) <= Number(currentValueString)) throw `Version '${newVersion}' is smaller than '${this.version}'`
  }
  /* #endregion */

  /* #region  GENERAL METHODS */
  /**
   * Retrieves the version replacing '.' to '_'
   * @param version The version to be converted to snake_case
   * @returns
   */
  #snake (version: string) {
    return version.replaceAll('.', '_')
  }
  /* #endregion */

  /* #region CLASS PROPERTIES */
  #file: FileInput
  #zip: JSZip
  /**
   * The ***Solution*** file name. It is update as a new version is set
   */
  name: string
  /**
   * The ***Solution*** version. It is update as a new version is set
   */
  version: string
  /**
   * The ***Solution*** data as Base64. It is updated as new copies are added.
   */
  data: Base64
  #workflows: PrivateWorkflowT[]
  #customisations: Xml
  #customisationsData: CustomisationsXml
  #solution: Xml
  #solutionData: SolutionXml
  #wasLoaded = false
  /* #endregion */
}
