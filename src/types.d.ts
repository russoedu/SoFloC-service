
import JSZip, { JSZipObject } from 'jszip'

export type Xml = string

export type Workflow = {
  name: string,
  id: string,
  file: JSZipObject,
}
export type OriginT = {
  guid: string,
  upperGuid: string,
  file: Buffer,
  zip: JSZip,
  name: string,
  version: string,
  snakeVersion: string,
}
export type FlowCopyT = {
  guid: string,
  upperGuid: string,
  name: string,
  fileName: string,
}

export type NewSolutionT = {
  version: string,
  name: string
}
export interface ZipInterface {
  /**
   * List with the name of the workflows
   */
   workflows: Workflow[]
  /**
   * The customisations XML
   */
   customisations: Xml
  /**
   * The solution XML
   */
   solution: Xml
  /**
   * The current version of the solution
   */
   currentVersion: string

  /**
   * The object with the data related to the origin file
   */
   origin: OriginT
  /**
   * The object with the data related to the copy
   */
   copy: FlowCopyT
   solutionCopy: NewSolutionT
}
