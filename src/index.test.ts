/* eslint-disable @typescript-eslint/no-var-requires */
/** global: jest */
import { readFileSync } from 'fs'
import JSZip, { loadAsync } from 'jszip'
import { join } from 'path'
import { SoFloC } from '.'
import expectedZipCopy from './_jest/expectedZipCopy'
import expectedZipDelete from './_jest/expectedZipDelete'
const crypto = require('crypto')

jest.setTimeout(10 * 60 * 1000)

describe('SoFloC', () => {
  let file: Buffer
  const name = 'TestSolution_2_0_0_0.zip'
  const path = join(__dirname, '_jest', name)

  beforeEach(() => {
    jest.mock('crypto')
    crypto.randomUUID = jest.fn()
      .mockReturnValueOnce('01234567-xxxx-yyyy-zzzz-987654321098')
      .mockReturnValueOnce('12345678-yyyy-zzzz-xxxx-876543210987')
      .mockReturnValueOnce('23456789-zzzz-xxxx-yyyy-765432109876')
    file = readFileSync(path)
  })
  describe('copyFlow', () => {
    test('happy path', async () => {
      const sofloc = new SoFloC(file, name)
      await sofloc.copyFlow('f4910f26-8210-ec11-b6e6-002248842287', 'First Copy Flow', '2.1.0.0')
      await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Second Copy Flow')
      await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'Third Copy Flow')

      const zip = await loadAsync(sofloc.data, { base64: true })
      expect(zip.files).toMatchObject(expectedZipCopy)

      expect(sofloc.name).toEqual('TestSolution_2_1_0_0.zip')
      expect(sofloc.version).toEqual('2.1.0.0')

      for (const key in zip.files) {
        if (Object.prototype.hasOwnProperty.call(zip.files, key)) {
          if (key !== 'Workflows/') {
            const file = zip.files[key]
            const data = await file.async('string')

            const expectedData = readFileSync(join(__dirname, '_jest', 'unzipedCopy', key)).toString()
            expect(cleanLineBreak(data)).toEqual(cleanLineBreak(expectedData))
          }
        }
      }

      expect(sofloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
        { id: '23456789-zzzz-xxxx-yyyy-765432109876', name: 'Third Copy Flow' },
        { id: '12345678-yyyy-zzzz-xxxx-876543210987', name: 'Second Copy Flow' },
        { id: 'f4910f26-8210-ec11-b6e6-002248842287', name: 'Second Test Flow' },
        { id: '01234567-xxxx-yyyy-zzzz-987654321098', name: 'First Copy Flow' },
      ])
    })
    test('failed to load', async () => {
      const sofloc = new SoFloC(null as any, null as any)
      let err: any

      try {
        await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Failed to unzip the file')
    })
    test('Workflow not on the solution', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['Workflows/FirstTestFlow-0F48CBA9-EF0C-ED11-82E4-000D3A64F6F2.json']

      const data = await zipBack(zip)

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
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

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
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

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.copyFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', 'First Copy Flow')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("Workflow file with GUID '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'")
    })
  })
  describe('deleteFlow', () => {
    test('happy path', async () => {
      const sofloc = new SoFloC(file, name)
      await sofloc.deleteFlow('f4910f26-8210-ec11-b6e6-002248842287')

      const zip = await loadAsync(sofloc.data, { base64: true })
      expect(zip.files).toMatchObject(expectedZipDelete)

      expect(sofloc.name).toEqual('TestSolution_2_0_0_0.zip')
      expect(sofloc.version).toEqual('2.0.0.0')

      for (const key in zip.files) {
        if (Object.prototype.hasOwnProperty.call(zip.files, key)) {
          if (key !== 'Workflows/') {
            const file = zip.files[key]
            const data = await file.async('string')

            const expectedData = readFileSync(join(__dirname, '_jest', 'unzipedDelete', key)).toString()
            expect(cleanLineBreak(data)).toEqual(cleanLineBreak(expectedData))
          }
        }
      }

      expect(sofloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
      ])
    })
    test('failed to load', async () => {
      const sofloc = new SoFloC(null as any, null as any)
      let err: any

      try {
        await sofloc.deleteFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Failed to unzip the file')
    })
    test('Workflow not on the solution', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['Workflows/FirstTestFlow-0F48CBA9-EF0C-ED11-82E4-000D3A64F6F2.json']

      const data = await zipBack(zip)

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.deleteFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2')
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

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.deleteFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2')
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

      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.deleteFlow('0f48cba9-ef0c-ed11-82e4-000d3a64f6f2')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("Workflow file with GUID '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2' does not exist in this Solution or the Solution was changed without updating 'solution.xml' or 'customizations.xml'")
    })
  })
  describe('updateVersion', () => {
    test('invalid version', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('1.7.')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Version \'1.7.\' is not valid. It should follow the format <major>.<minor>.<?build>.<?revision>.')
      expect(sofloc.version).toBe('2.0.0.0')
    })
    test('smaller version', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('1.99.99.99')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Version \'1.99.99.99\' is smaller than \'2.0.0.0\'')
      expect(sofloc.version).toBe('2.0.0.0')
    })
    test('smaller version with less chars', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('1.9')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Version \'1.9\' is smaller than \'2.0.0.0\'')
      expect(sofloc.version).toBe('2.0.0.0')
    })
    test('bigger version with less chars', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('2.1')
      } catch (error) {
        err = error
      }
      expect(err).toBeUndefined()
      expect(sofloc.version).toBe('2.1')
    })
    test('same version with less chars', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('2.0')
      } catch (error) {
        err = error
      }
      expect(sofloc.version).toBe('2.0.0.0')
      expect(err.message).toBe('Version \'2.0\' is smaller than \'2.0.0.0\'')
    })
    test('same version', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('2.0.0.0')
      } catch (error) {
        err = error
      }
      expect(err).toBeUndefined()
      expect(sofloc.version).toBe('2.0.0.0')
    })
    test('bigger version then smaller, but bigger than original', async () => {
      const sofloc = new SoFloC(file, name)

      let err: any
      try {
        await sofloc.updateVersion('2.3')
        await sofloc.updateVersion('2.1.0.0')
      } catch (error) {
        err = error
      }
      expect(err).toBeUndefined()
      expect(sofloc.version).toBe('2.1.0.0')
    })
  })
  describe('get workflows', () => {
    test('not loaded', async () => {
      const sofloc = new SoFloC(file, name)

      const wfs = sofloc.workflows
      expect(wfs).toEqual([])
    })
  })
  describe('data', () => {
    test('version is updated', async () => {
      const sofloc = new SoFloC(file, name)
      await sofloc.updateVersion('2.1.0.0')

      const zip = await JSZip.loadAsync(sofloc.data, { base64: true })
      const solution = await zip.files['solution.xml'].async('string')
      const version = solution.match(/<Version>(.*)<\/Version>/) as any[]

      expect(version[1]).toBe('2.1.0.0')
      expect(sofloc.workflows).toEqual([
        { id: '0f48cba9-ef0c-ed11-82e4-000d3a64f6f2', name: 'First Test Flow' },
        { id: 'f4910f26-8210-ec11-b6e6-002248842287', name: 'Second Test Flow' },
      ])
    })
  })
  describe('#load', () => {
    test('version not found on Solution)', async () => {
      const zip = await loadAsync(file, { base64: true })
      let solution = await zip.files['solution.xml'].async('string')
      solution = solution.replace('<Version>2.0.0.0</Version>', '')
      zip.file('solution.xml', solution)

      const data = await zipBack(zip)
      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.updateVersion('2.1.0.0')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe('Failed to retrieve the version')
    })
    test('solution.xml not found', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['solution.xml']

      const data = await zipBack(zip)
      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.updateVersion('2.1.0.0')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("'solution.xml' was not found in the Solution zip")
    })
    test('customizations.xml not found', async () => {
      const zip = await loadAsync(file, { base64: true })
      delete zip.files['customizations.xml']

      const data = await zipBack(zip)
      const sofloc = new SoFloC(data, name)

      let err: any
      try {
        await sofloc.updateVersion('2.1.0.0')
      } catch (error) {
        err = error
      }
      expect(err.message).toBe("'customizations.xml' was not found in the Solution zip")
    })
  })
})

async function zipBack (zip: JSZip) {
  return await zip.generateAsync({
    type:               'base64',
    compression:        'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  })
}

function cleanLineBreak (content: string) {
  return content.replace(/\r\n/gm, '\n')
}
