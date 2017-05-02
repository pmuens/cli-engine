// @flow

import {type Config} from 'cli-engine-config'
import type Output from 'cli-engine-command/lib/output'
import path from 'path'
import Yarn from './yarn'
import klaw from 'klaw-sync'
import fs from 'fs-extra'
import {IPluginManager, PluginPath} from './plugin_manager'

type PJSON = {
  name: string,
  main?: string,
  scripts?: {
    prepare?: string
  }
}

function touch (f: string) {
  fs.utimesSync(f, new Date(), new Date())
}

export default class LinkedPlugins implements IPluginManager {
  constructor (out: Output) {
    this.out = out
    this.config = this.out.config
    try {
      this._data = fs.readJSONSync(this.file)
      this._data.updated_at = new Date(this._data.updated_at || 0)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      this._data = {
        version: '1',
        updated_at: new Date(),
        plugins: []
      }
    }
  }

  config: Config
  out: Output
  _data: {
    version: string,
    updated_at: Date,
    plugins: string[]
  }

  /**
   * adds a linked plugin
   * @param {string} p - path of plugin
   */
  async add (p: string) {
    if (!this.config.debug) this.out.action.start(`Running prepare script for ${p}`)

    await this.prepare(p)

    // flow$ignore
    let m = require(p)
    if (!m.commands) throw new Error(`${p} does not appear to be a CLI plugin`)

    this._data.plugins.push(p)
    this._save()

    this.out.action.stop()
  }

  /**
   * removes a linked plugin
   * @param {string} p - path of plugin
   */
  remove (p: string) {
    this._data.plugins = this._data.plugins.filter(q => q !== p)
    this._save()
  }

  /**
   * list linked plugins
   * @returns {PluginPath[]}
   */
  list (): PluginPath[] {
    return this._data.plugins.map(p => {
      return new PluginPath({output: this.out, type: 'link', path: p})
    })
  }

  /**
   * runs prepare() on all linked plugins
   */
  async refresh () : Promise<string[]> {
    let paths : string[] = []
    let updatedAt = new Date()
    for (let plugin of this._data.plugins) {
      try {
        if (await this.prepare(plugin)) {
          paths.push(plugin)
        }
      } catch (err) {
        this.out.warn(`Error refreshing ${plugin}`)
        this.out.warn(err)
      }
    }
    if (paths.length > 0) {
      this._data.updated_at = updatedAt
      this._save()
    }
    return paths
  }

  /**
   * installs plugin dependencies and runs npm prepare if needed
   */
  async prepare (p: string) : Promise<boolean> {
    let pjson = this._pjson(p)
    await this._install(p)
    if (!pjson.main) throw new Error(`No main script specified in ${path.join(p, 'package.json')}`)
    let main = path.join(p, pjson.main)

    if (!this._needsPrepare(p, main)) return false

    if (pjson.scripts && pjson.scripts.prepare) {
      if (!this.config.debug) this.out.action.start(`Running prepare script for ${p}`)
      let yarn = new Yarn(this.out, p)
      await yarn.exec(['run', 'prepare'])
      this.out.action.stop()
    }

    return true
  }

  _save () {
    fs.writeJSONSync(this.file, this._data)
  }

  _needsInstall (p: string): boolean {
    let modules = path.join(p, 'node_modules')
    if (!fs.existsSync(modules)) return true
    let modulesInfo = fs.statSync(modules)
    let pjsonInfo = fs.statSync(path.join(p, 'package.json'))
    return modulesInfo.mtime < pjsonInfo.mtime
  }

  _needsPrepare (p: string, main: string): boolean {
    if (!fs.existsSync(main)) return true
    return !!klaw(p, {nodir: true, ignore: '{node_modules,.git}'})
    .filter(f => f.path.endsWith('.js'))
    .find(f => f.stats.mtime > this._data.updated_at)
  }

  async _install (p: string) {
    if (!this._needsInstall(p)) return
    if (!this.config.debug) this.out.action.start(`Installing dependencies for ${p}`)
    let yarn = new Yarn(this.out, p)
    await yarn.exec([])
    touch(path.join(p, 'node_modules'))
    this.out.action.stop()
  }

  checkLinked (p: string) {
    if (this._data.plugins.includes(p)) throw new Error(`${p} is already linked`)
    return this._pjson(p).name
  }

  // flow$ignore
  _pjson (p: string): PJSON { return require(path.join(p, 'package.json')) }

  get file (): string { return path.join(this.config.dataDir, 'linked_plugins.json') }
}