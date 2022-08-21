/* eslint-disable @typescript-eslint/no-var-requires */
import { readFileSync } from 'fs'
import JSZip, { loadAsync } from 'jszip'
import { join } from 'path'
import { pafloc } from './pafloc'
import expectedData from './_jest/expectedData.json'
import expectedZip from './_jest/expectedZip'
const crypto = require('crypto')

jest.setTimeout(10 * 60 * 1000)

async function zipBack (zip: JSZip) {
  return await zip.generateAsync({
    type:               'base64',
    compression:        'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  })
}
describe('pafloc', () => {
  let file: Buffer
  const name = 'TestSolution_2_0_0_0.zip'
  const path = join(__dirname, '_jest', name)

  beforeEach(() => {
    pafloc.data = undefined as any
    pafloc.name = undefined as any
    pafloc.version = undefined as any

    jest.mock('crypto')
    crypto.randomUUID = jest.fn()
      .mockReturnValueOnce('01234567-xxxx-yyyy-zzzz-987654321098')
      .mockReturnValueOnce('12345678-yyyy-zzzz-xxxx-876543210987')
      .mockReturnValueOnce('23456789-zzzz-xxxx-yyyy-765432109876')
    file = readFileSync(path)
  })
  describe('load', () => {
    test('file not loaded', async () => {
      let err: any

      try {
        await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Solution was not loaded')
    })
    test('load valid zip', async () => {
      await pafloc.load(file, name)

      expect(pafloc).toEqual(expectedData)
      expect(pafloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
        { id: 'f4910f26-8210-ec11-b6e6-002248842287', name: 'Second Test Flow' },
      ])
    })
    test('version not found on Solution)', async () => {
      const zip = await loadAsync(file, { base64: true })
      let solution = await zip.files['solution.xml'].async('string')
      solution = solution.replace('<Version>2.0.0.0</Version>', '')
      zip.file('solution.xml', solution)

      const data = await zipBack(zip)

      let err: any
      try {
        await pafloc.load(data, name)
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Failed to retrieve the version')
    })
    test('solution.xml not found', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['solution.xml']

      const data = await zipBack(zip)

      let err: any
      try {
        await pafloc.load(data, name)
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("'solution.xml' was not found in the Solution zip")
    })
    test('customizations.xml not found', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['customizations.xml']

      const data = await zipBack(zip)

      let err: any
      try {
        await pafloc.load(data, name)
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("'customizations.xml' was not found in the Solution zip")
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
  })
  describe('copyFlow and version', () => {
    test('happy path', async () => {
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
    test('Workflow not on the solution', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['Workflows/FirstTestFlow-0F48CBA9-EF0C-ED11-82E4-000D3A64F6F2.json']

      const data = await zipBack(zip)

      await pafloc.load(data, name)

      let err: any
      try {
        await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("Workflow file with GUID '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'")
    })
    test('GUID not found on solution.xml', async () => {
      const zip = await loadAsync(file, { base64: true })
      let solution = await zip.files['solution.xml'].async('string')
      solution = solution.replace('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', '000000000-aaaa-bbbb-cccc-000000000000')
      zip.file('solution.xml', solution)

      const data = await zipBack(zip)

      await pafloc.load(data, name)

      let err: any
      try {
        await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("Workflow file with GUID '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'")
    })
    test('GUID not found on customizations.xml', async () => {
      const zip = await loadAsync(file, { base64: true })
      let customisations = await zip.files['customizations.xml'].async('string')
      customisations = customisations.replace('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', '000000000-aaaa-bbbb-cccc-000000000000')
      zip.file('customizations.xml', customisations)

      const data = await zipBack(zip)

      await pafloc.load(data, name)

      let err: any
      try {
        await pafloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("Workflow file with GUID '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'")
    })
    test('invalid version', async () => {
      await pafloc.load(file, name)

      let err: any
      try {
        await pafloc.updateVersion('1.7.')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Version \'1.7.\' is not valid. It should follow the format <major>.<minor>.<build>.<revision>.')
    })
    test('smaller version', async () => {
      await pafloc.load(file, name)

      let err: any
      try {
        await pafloc.updateVersion('1.99.99.99')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Version \'1.99.99.99\' is smaller than \'2.0.0.0\'')
    })
  })
})
