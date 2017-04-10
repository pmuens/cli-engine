// @flow

import PluginsIndex from './index'

jest.mock('../../plugins', () => {
  return class Plugins {
    list () {
      return [
        { name: 'heroku-foo', type: 'core', options: {} },
        { name: 'heroku-pg', type: 'user', options: { tag: 'latest' }, version: '1.0.1' },
        { name: 'heroku-debug', type: 'user', options: { tag: 'alpha' }, version: '1.0.0' },
        { name: 'heroku-apps', type: 'link', options: {}, version: '1.0.0' }
      ]
    }
  }
})

test('updates plugins', async () => {
  let cmd = await PluginsIndex.mock()
  expect(cmd.stdout.output).toEqual(`heroku-apps 1.0.0 (link)
heroku-debug 1.0.0 (alpha)
heroku-pg 1.0.1
`)
})
