// @flow

import Command from 'cli-engine-command'
import Plugins from '../../plugins'

export default class PluginsUpdate extends Command {
  static topic = 'plugins'
  static command = 'update'
	static description = 'update a plugin to the latest version'

  plugins: Plugins

  async run () {
    this.plugins = new Plugins(this.out)
    await this.plugins.update()
  }
}
