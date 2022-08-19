/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync } from 'fs'
import { loadAsync } from 'jszip'
import { join } from 'path'
import { pafloc } from './pafloc'
import expectedData from './_jest/expectedData.json'
import expectedZip from './_jest/expectedZip'
const crypto = require('crypto')

jest.setTimeout(10 * 60 * 1000)

describe('pafloc', () => {
  beforeEach(() => {
    pafloc.data = ''
    pafloc.name = ''
    pafloc.version = ''

    jest.mock('crypto')
    crypto.randomUUID = jest.fn()
      .mockReturnValueOnce('01234567-xxxx-yyyy-zzzz-987654321098')
      .mockReturnValueOnce('12345678-yyyy-zzzz-xxxx-876543210987')
      .mockReturnValueOnce('23456789-zzzz-xxxx-yyyy-765432109876')
  })
  describe('load', () => {
    test('load valid zip', async () => {
      const name = 'TestSolution_2_0_0_0.zip'
      const path = join(__dirname, '_jest', name)
      const file = readFileSync(path)

      await pafloc.load(file, name)

      expect(pafloc).toEqual(expectedData)
      expect(pafloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
        { id: 'f4910f26-8210-ec11-b6e6-002248842287', name: 'Second Test Flow' },
      ])
      // TODO spy

      // expect(JSZip.loadAsync).toBeCalledWith('FILE DATA')

      /*
       * expect(loadAsync.files['customizations.xml'].async).toBeCalledWith('string')
       * expect(loadAsync.files['solution.xml'].async).toBeCalledWith('string')
       */

      /*
       * expect(xml2js).toBeCalledTimes(2)
       * expect(xml2js).toBeCalledWith(customizationsXml, { compact: true })
       * expect(xml2js).toBeCalledWith(solutionXml, { compact: true })
       * expect(generateAsync).toBeCalledWith({
       *   type:               'base64',
       *   compression:        'DEFLATE',
       *   compressionOptions: {
       *     level: 9,
       *   },
       * })
       */
    })
    test('failed to load zip', async () => {
      let err: any
      try {
        await pafloc.load('FILE DATA' as any, 'file name')
      } catch (error) {
        err = error
      }
      expect(pafloc).toEqual({
        data:    undefined,
        name:    undefined,
        version: undefined,
      })
      expect(pafloc.workflows).toEqual([])
      expect(err.message).toEqual('Failed to unzip the file')
    })
    /*
     * test('failed to get customisations', async () => {
     *   let err: any
     *   try {
     *     await pafloc.load('FILE DATA' as any, 'file name')
     *   } catch (error) {
     *     err = error
     *   }
     *   expect(pafloc).toEqual({
     *     data:    '',
     *     name:    'file name',
     *     version: '',
     *   })
     *   expect(err.message).toEqual('Failed to load \'customizations\' from \'file name\'')
     * })
     * test('failed to get solutions', async () => {
     *   let err: any
     *   try {
     *     await pafloc.load('FILE DATA' as any, 'file name')
     *   } catch (error) {
     *     err = error
     *   }
     *   expect(pafloc).toEqual({
     *     data:    '',
     *     name:    'file name',
     *     version: '',
     *   })
     *   expect(err.message).toEqual('Failed to load \'solution\' from \'file name\'')
     * })
     * test('failed to get version', async () => {
     *   let err: any
     *   try {
     *     await pafloc.load('FILE DATA' as any, 'file name')
     *   } catch (error) {
     *     err = error
     *   }
     *   expect(pafloc).toEqual({
     *     data:    '',
     *     name:    'file name',
     *     version: '',
     *   })
     *   expect(err.message).toEqual('Filed to retrieve the version from \'file name\'')
     * })
     */
  })
  describe('copyFlow and version', () => {
    test('happy path', async () => {
      const name = 'TestSolution_2_0_0_0.zip'
      const path = join(__dirname, '_jest', name)
      const file = readFileSync(path)

      await pafloc.load(file, name)
      await pafloc.updateVersion('2.1.0.0')
      await pafloc.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'First Copy Flow')
      await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Second Copy Flow')
      await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Third Copy Flow')

      const zip = await loadAsync(pafloc.data, { base64: true })
      expect(zip.files).toMatchObject(expectedZip)

      expect(pafloc.name).toEqual('TestSolution_2_1_0_0.zip')
      expect(pafloc.version).toEqual('2.1.0.0')

      for (const key in zip.files) {
        if (Object.prototype.hasOwnProperty.call(zip.files, key)) {
          if (key !== 'Workflows/') {
            const file = zip.files[key]
            const data = await file.async('string')

            const expectedData = readFileSync(join(__dirname, '_jest', 'unziped', key)).toString()
            expect(data).toBe(expectedData)
          }
        }
      }

      expect(pafloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
        { id: '23456789-zzzz-xxxx-yyyy-765432109876', name: 'Third Copy Flow' },
        { id: '12345678-yyyy-zzzz-xxxx-876543210987', name: 'Second Copy Flow' },
        { id: 'f4910f26-8210-ec11-b6e6-002248842287', name: 'Second Test Flow' },
        { id: '01234567-xxxx-yyyy-zzzz-987654321098', name: 'First Copy Flow' },
      ])
    })
  })
})
