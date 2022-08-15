/* eslint-disable @typescript-eslint/no-var-requires */
import { pafloc } from './pafloc'
import { generateAsync, loadAsync, loadAsyncWithoutCustomisations, loadAsyncWithoutSolution, xml2js, xml2jsWithoutVersion } from './_jest/data/mocks'

const JSZip = require('jszip')
const parser = require('xml-js')

describe('pafloc', () => {
  describe('load', () => {
    beforeEach(() => {
      pafloc.data = ''
      pafloc.name = ''
      pafloc.version = ''
      jest.mock('jszip')
      JSZip.loadAsync = jest.fn().mockResolvedValue(loadAsync)

      jest.mock('xml-js')
      parser.xml2js = xml2js
    })
    test('load valid zip', async () => {
      await pafloc.load('FILE DATA' as any, 'file name')

      expect(pafloc).toEqual({
        data:    'zip data',
        name:    'file name',
        version: 'version',
      })
      expect(JSZip.loadAsync).toBeCalledWith('FILE DATA')

      expect(loadAsync.files['customizations.xml'].async).toBeCalledWith('string')
      expect(loadAsync.files['solution.xml'].async).toBeCalledWith('string')

      expect(xml2js).toBeCalledTimes(2)
      expect(xml2js).toBeCalledWith('customisations xml data', { compact: true })
      expect(xml2js).toBeCalledWith('solution xml data', { compact: true })
      expect(generateAsync).toBeCalledWith({
        type:               'base64',
        compression:        'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      })
    })
    test('failed to load zip', async () => {
      let err: any
      JSZip.loadAsync = jest.fn().mockRejectedValue('ERROR')
      try {
        await pafloc.load('FILE DATA' as any, 'file name')
      } catch (error) {
        err = error
      }
      expect(pafloc).toEqual({
        data:    '',
        name:    'file name',
        version: '',
      })
      expect(err.message).toEqual('Failed to unzip the file')
    })
    test('failed to get customisations', async () => {
      JSZip.loadAsync = jest.fn().mockResolvedValue(loadAsyncWithoutCustomisations)
      let err: any
      try {
        await pafloc.load('FILE DATA' as any, 'file name')
      } catch (error) {
        err = error
      }
      expect(pafloc).toEqual({
        data:    '',
        name:    'file name',
        version: '',
      })
      expect(err.message).toEqual('Failed to load \'customizations\' from \'file name\'')
    })
    test('failed to get solutions', async () => {
      JSZip.loadAsync = jest.fn().mockResolvedValue(loadAsyncWithoutSolution)
      let err: any
      try {
        await pafloc.load('FILE DATA' as any, 'file name')
      } catch (error) {
        err = error
      }
      expect(pafloc).toEqual({
        data:    '',
        name:    'file name',
        version: '',
      })
      expect(err.message).toEqual('Failed to load \'solution\' from \'file name\'')
    })
    test('failed to get version', async () => {
      let err: any
      parser.xml2js = xml2jsWithoutVersion
      try {
        await pafloc.load('FILE DATA' as any, 'file name')
      } catch (error) {
        err = error
      }
      expect(pafloc).toEqual({
        data:    '',
        name:    'file name',
        version: '',
      })
      expect(err.message).toEqual('Filed to retrieve the version from \'file name\'')
    })
  })
})
