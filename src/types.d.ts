/* istanbul ignore file */
/* eslint-disable no-undef */

import JSZip, { JSZipObject } from 'jszip'

export type Xml = string

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

export type FlowCopyT = {
  guid: string,
  upperGuid: string,
  name: string,
  fileName: string,
}

export type Base64 = string

export type PrivateWorkflowT = {
  name: string,
  id: string,
  file: JSZipObject,
}

export type WorkflowT = {
  name: string,
  id: string,
}

export interface PAFloCInterface {
  /**
   * The ***Solution*** file name. It is update as a new version is set
   */
  name: string
  /**
   * The ***Solution*** version. It is update as a new version is set
   */
  version: string
  /**
   * The list of workflows in the ***Solution***. It is updated as new copies are added.
   */
  workflows: WorkflowT[]
  /**
   * The ***Solution*** data as Base64. It is updated as new copies are added.
   */
  data: Base64

  #file: FileInput
  #zip: JSZip
  #workflows: PrivateWorkflowT[]
  #customisations: Xml
  #solution: Xml
  #loaded: boolean

}
