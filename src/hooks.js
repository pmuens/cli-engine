// @flow

import type {Config} from 'cli-engine-config'
import path from 'path'

export default class Hooks {
  config: Config
  hooks: {[name: string]: string[]}

  constructor ({config}: {config: Config}) {
    this.config = config
    this.hooks = {}
    let cliEngine: any = config.pjson['cli-engine'] || {}
    for (let [name, script] of Object.entries(cliEngine['hooks'] || {})) {
      if (typeof script !== 'string') throw new Error(`expected ${name} to be a string`)
      this.register(name, script)
    }
  }

  register (name: string, script: string) {
    this.hooks[name] = this.hooks.name || []
    this.hooks[name].push(script)
  }

  async run (name: string, args: Object) {
    for (let script of this.hooks[name] || []) {
      let hook = require(path.join(this.config.root, script))
      await hook(args)
    }
  }
}
