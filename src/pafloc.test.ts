/* eslint-disable @typescript-eslint/no-var-requires */
import { pafloc } from './pafloc'

const JSZip = require('jszip')
const parser = require('xml-js')

describe('pafloc', () => {
  beforeEach(() => {
    pafloc.data = ''
    pafloc.name = ''
    pafloc.version = ''
    jest.mock('jszip')
    jest.mock('xml-js')
    JSZip.loadAsync = jest.fn().mockResolvedValue({
      files: {
        'solution.xml': {
          async: jest.fn().mockResolvedValue('solution'),
        },
        'customizations.xml': {
          async: jest.fn().mockResolvedValue('customizations'),
        },
        'Workflows/WF01-WF-ID-01.json': {
          name: 'WF01-WF-ID-01',
        },
        'Workflows/WF02-WF-ID-02.json': {
          name: 'WF02-WF-ID-02',
        },
      },
      generateAsync: jest.fn().mockResolvedValue('zip data'),
    })

    parser.xml2js = jest.fn((entry: any) => {
      if (entry === 'solution') {
        return {
          ImportExportXml: {
            SolutionManifest: {
              Version: {
                _text: 'version',
              },
            },
          },
        }
      } else {
        return {
          ImportExportXml: {
            Workflows: {
              Workflow: [
                { _attributes: { Name: 'WF 01', WorkflowId: '{wf-id-01}' } },
                { _attributes: { Name: 'WF 02', WorkflowId: '{wf-id-02}' } },
              ],
            },
          },
        }
      }
    })
  })
  describe('load', () => {
    test('load valid zip', async () => {
      await pafloc.load('FILE DATA' as any, 'file name')

      expect(pafloc).toEqual({
        data:    'zip data',
        name:    'file name',
        version: 'version',
      })
    })
    test('failed to load', async () => {
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
      expect(err.message).toEqual('Failed to unzip \'file name\'')
    })
  })
})
