/* istanbul ignore file */
/* eslint-disable no-undef */

import { JSZipObject } from 'jszip'

export type Xml = string

export interface InputByType {
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
