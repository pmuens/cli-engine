// @flow

import {tmpDirs} from '../../test/helpers'
import CLI from '../cli'
import path from 'path'
import fs from 'fs-extra'

jest.unmock('fs-extra')

let mockYarnExec
jest.mock('./yarn', () => {
  return class {
    exec = mockYarnExec
  }
})

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000

let tmpDir
beforeEach(async () => {
  tmpDir = await tmpDirs()
  mockYarnExec = jest.fn()
})

afterEach(() => {
  tmpDir.clean()
})

test.skip('plugins should be reloaded if migrated', async () => {
  let dataDir = tmpDir.dataDir

  let src = path.join(__dirname, '..', '..', 'test', 'links', 'test-migrator')
  fs.mkdirsSync(path.join(dataDir, 'plugins'))

  let dst = path.join(dataDir, 'plugins', 'node_modules', 'test-migrator')
  fs.copySync(src, dst)

  let json = [{name: 'test-migrator'}]
  fs.writeJSONSync(path.join(dataDir, 'plugins', 'plugins.json'), json)

  let cli = new CLI({argv: ['cli', 'migrator'], mock: true, config: tmpDir.config})
  try {
    await cli.run()
  } catch (err) {
    if (err.code !== 0) throw err
  }

  expect(mockYarnExec).toBeCalledWith(['install', '--force'])
})
