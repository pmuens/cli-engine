// @flow

import Command from 'cli-engine-command'
import Plugins from '../plugins'

export default class extends Command {
  static topic = 'which'
  static description = 'show which plugin a command is from'
  static args = [
    {name: 'command'}
  ]

  plugins: Plugins

  async run () {
    this.plugins = new Plugins({output: this.out})
    const [command] = this.argv
    const plugin = await this.plugins.findPluginWithCommand(command)
    if (!plugin) throw new Error('not found')
    if (plugin.type === 'builtin') {
      this.out.log('builtin command')
    } else {
      this.out.log(`Command from ${plugin.type} plugin ${plugin.name}`)
    }
  }
}
