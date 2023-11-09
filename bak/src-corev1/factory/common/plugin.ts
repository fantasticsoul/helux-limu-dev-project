import { EVENT_NAME } from '../../consts/user';
import { Fn, IPlugin, PluginCtx } from '../../types';
import type { TInternal } from '../creator/buildInternal';
import { getHelp } from '../root';

const { plugins, bus } = getHelp();
const { ON_DATA_CHANGED: ON_DATA_CHANGE } = EVENT_NAME;

export function addPlugin(plugin: IPlugin) {
  plugins.push(plugin);
  const pluginCtx: PluginCtx = {
    on: (evName: string, cb: Fn) => bus.on(evName, cb),
    onStateChanged: (cb: Fn) => bus.on(ON_DATA_CHANGE, cb),
  };
  plugin.install(pluginCtx);
}

export function emitDataChanged(internal: TInternal) {
  if (bus.canEmit(ON_DATA_CHANGE)) {
    const { sharedKey, moduleName, rawStateSnap: snap } = internal;
    bus.emit(ON_DATA_CHANGE, { snap, sharedKey, moduleName });
  }
}
