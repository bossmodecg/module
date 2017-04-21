import _ from 'lodash';
import { EventEmitter2 } from 'eventemitter2';
import NodeAsyncLocks from 'node-async-locks';

import { Logger } from './logger';

const jsondiffpatch = require('jsondiffpatch').create({});

const DEFAULT_MODULE_OPTIONS =
  Object.freeze(
    {
      internalStateUpdatesOnly: false,
      managementEventWhitelist: null,
      shouldCacheState: true,
      readCacheCallback: (cacheState) => cacheState
    }
  );

export default class Module extends EventEmitter2 {
  constructor(name, config = {}, moduleOptions = {}) {
    super({ wildcard: true, newListener: false });

    this.register = this.register.bind(this);
    this.emit = this.emit.bind(this);
    this.emitAsync = this.emitAsync.bind(this);
    this.on = this.on.bind(this);

    this._name = name.toLowerCase();
    this._config = Object.freeze(_.merge({}, this.defaultConfig, config));
    this._moduleOptions = Object.freeze(_.merge({}, DEFAULT_MODULE_OPTIONS, moduleOptions));

    this._logger = new Logger(`module-${name}`);
    this._logger.setLogLevel(this.config.logLevel);

    this._state = {};
  }

  get name() { return this._name; }
  get logger() { return this._logger; }
  get config() { return this._config; }
  get server() { return this._server; }

  get storePath() { return this._server.moduleStorePath(this._name); }

  get state() { return this._state; }
  get safeState() { return _.cloneDeep(this._state); }

  get defaultConfig() { return {}; }

  storePathFile(filename) {
    return this._server.moduleStorePath(this._name, filename);
  }

  async register(server, http) {
    this._logger.info("Registering.");

    this._server = server;

    if (this._moduleOptions.shouldCacheState) {
      this._state = this._moduleOptions.readCacheCallback(await this.server.readModuleCache(this._name));
      await this.server.writeModuleCache(this._name, this._state);
    }

    this.emit("internal.registerServer", server);
    this.emit("internal.registerHttp", http);
  }

  /**
   * Updates the current state of the module. This is a recursive merge of the
   * current state and the object provided (so arrays will be overwritten, that
   * must be handled manually). If this module is configured to cache state,
   * this method will not return until the cache has been written (and so you
   * shouldn't await on it).
   *
   * This method also locks; only one state modification can be in progress at
   * any time.
   *
   * @param {object} stateDelta the delta to apply to the module state.
   */
  async setState(stateDelta) {
    // TODO: we should figure out a way to delete keys. Setting to null is suboptimal.
    const updatedState =
      await NodeAsyncLocks.lockPromise(`${this.name}-state`, async () => {
        const oldState = this._state;
        const newState = _.merge({}, this._state, stateDelta);

        this._state = newState;

        if (this._moduleOptions.shouldCacheState) {
          await this.server.writeModuleCache(this.name, this._state);
        }

        const delta = jsondiffpatch.diff(oldState, newState);
        const deltaEvent = { bmName: this.name, delta };

        this.emit("stateChanged", { state: newState, delta });
        this.server.pushEvent("stateDelta", deltaEvent);

        return this._state;
      });

    return updatedState;
  }

  pushEvent(eventName, event) {
    this.server.pushEvent(`${this.name}.${eventName}`, event);
  }
}
