/* istanbul ignore file */

export const generateAsync = jest.fn().mockResolvedValue('zip data')
export const loadAsync = {
  files: {
    'solution.xml': {
      async: jest.fn().mockResolvedValue('solution xml data'),
    },
    'customizations.xml': {
      async: jest.fn().mockResolvedValue('customisations xml data'),
    },
    'Workflows/WF01-WF-ID-01.json': {
      name: 'WF01-WF-ID-01',
    },
    'Workflows/WF02-WF-ID-02.json': {
      name: 'WF02-WF-ID-02',
    },
  },
  generateAsync,
}

export const loadAsyncWithoutSolution = {
  files: {
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
}

export const loadAsyncWithoutCustomisations = {
  files: {
    'solution.xml': {
      async: jest.fn().mockResolvedValue('solution'),
    },
    'Workflows/WF01-WF-ID-01.json': {
      name: 'WF01-WF-ID-01',
    },
    'Workflows/WF02-WF-ID-02.json': {
      name: 'WF02-WF-ID-02',
    },
  },
  generateAsync: jest.fn().mockResolvedValue('zip data'),
}

export const xml2js = jest.fn((entry: any) => {
  if (entry === 'solution xml data') {
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

export const xml2jsWithoutVersion = jest.fn((entry: any) => {
  if (entry === 'solution') {
    return {
      ImportExportXml: {
        SolutionManifest: {},
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
