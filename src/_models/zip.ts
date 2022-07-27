import { readFileSync } from 'fs'
import JSZip, { JSZipObject } from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { CustomizationsT, SolutionT } from '../_helpers/types'

class Zip {
  customizations: CustomizationsT
  solution: SolutionT
  workflows: JSZipObject[]

  async load (path: string) {
    const parser = new XMLParser()
    const file = readFileSync(path)

    const zipContent = await JSZip.loadAsync(file)
    const files = zipContent.files

    this.customizations = parser.parse(await files['customizations.xml'].async('string'))
    this.solution = parser.parse(await files['solution.xml'].async('string'))
    this.workflows = Object.entries(files).filter(([name]) => name.match(/Workflows\/.+\.json/)).map(file => file[1])
  }
}

const zip = new Zip()
export { zip }
