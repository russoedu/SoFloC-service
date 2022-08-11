/* eslint-disable no-undef */

import JSZip, { JSZipObject } from 'jszip'

export type Xml = string

export type Workflow = {
  name: string,
  id: string,
  file: JSZipObject,
}
interface InputByType {
  base64: string;
  string: string;
  text: string;
  binarystring: string;
  array: number[];
  uint8array: Uint8Array;
  arraybuffer: ArrayBuffer;
  blob: Blob;
  stream: NodeJS.ReadableStream;
}

export type FileInput = InputByType[keyof InputByType] | Promise<InputByType[keyof InputByType]>

export type OriginT = {
  guid: string,
  upperGuid: string,
  file: FileInput,
  zip: JSZip,
  name: string,
  version: string,
  snakeVersion: string,
  workflows: Workflow[],
  customisations: Xml
  solution: Xml
  currentVersion: string
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
   * The object with the data related to the origin file
   */
   #origin: OriginT
  /**
   * The object with the data related to the copy
   */
   #copy: FlowCopyT
   #solutionCopy: NewSolutionT
}
