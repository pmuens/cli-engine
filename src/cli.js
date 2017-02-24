// @flow

if (process.env.HEROKU_TIME_REQUIRE) require('time-require')

import Base from 'cli-engine-command'
import Plugins from './plugins'

import Updater from './updater'
import NotFound from './not_found'

export default class Main extends Base {
  async run () {
    process.on('exit', () => this.showCursor())
    process.on('SIGINT', err => this.error(err))
    process.on('uncaughtException', err => this.error(err))
    process.on('unhandledRejection', err => this.error(err))

    const updater = new Updater(this.config)
    const plugins = new Plugins(this.config)
    await updater.autoupdate()
    let Command = plugins.findCommand(this.config.argv[1] || this.config.defaultCommand)
    if (!Command) return new NotFound(this.config).run()
    this.command = new Command(this.config)
    try {
      await this.command._run()
    } catch (err) { this.command.error(err) }
    this.exit(0)
  }
}