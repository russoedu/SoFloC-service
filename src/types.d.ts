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

export type FileDataT = {
  file: FileInput,
  zip: JSZip,
  name: string,
  version: string,
  workflows: Workflow[],
  customisations: Xml,
  solution: Xml,
  data: string,
}

export type FlowDataT = {
  guid: string,
  upperGuid: string,
  name: string,
  fileName: string,
}

export type Base64 = sstring

export interface ZipInterface {
  /**
   * The object with the data related to the origin file
   */
  #file: FileDataT
  /**
   * The object with the data related to the copy
   */
  #flowCopyData: FlowDataT

  name: string
  version:string
  workflows: {
    name: string,
    id: string,
  }[]

  data: Base64
}
