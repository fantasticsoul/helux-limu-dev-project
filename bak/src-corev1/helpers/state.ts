import { setGlobalInternal } from '../factory/common/globalId';
import { getInternalMap } from '../factory/common/internal';
import type { TInternal } from '../factory/creator/buildInternal';
import { getHelp, getHeluxRoot } from '../factory/root';
import { Dict, IInnerCreateOptions, SharedDict, SharedState } from '../types';
import { getSafeNext, isDebug, isObj, safeMapGet } from '../utils';

const sharedScope = getHelp().sharedScope;
const internalMap = getInternalMap();
const { SHARED_KEY_STATE_MAP, STATE_SHARED_KEY_MAP, BEENING_WATCHED_MAP } = sharedScope;

export function getInternalByKey(sharedKey: number): TInternal {
  return internalMap.get(sharedKey) as TInternal;
}

export function getInternal(state: SharedState): TInternal {
  const key = getSharedKey(state);
  return getInternalByKey(key);
}

export function setInternal(state: SharedState, internal: TInternal) {
  const key = getSharedKey(state);
  internalMap.set(key, internal);
}

export function getRawState<T extends Dict>(state: T): T {
  const internal = getInternal(state);
  return internal.rawState;
}

export function getRawStateSnap<T extends Dict>(state: T): T {
  const internal = getInternal(state);
  return internal.rawStateSnap;
}

export function getSharedKey(state: Dict) {
  if (!isObj(state)) return 0;
  return STATE_SHARED_KEY_MAP.get(state) || 0;
}

export function isSharedState(maySharedState: any) {
  return !!STATE_SHARED_KEY_MAP.get(maySharedState);
}

export function markSharedKey(state: Dict) {
  const keySeed = getSafeNext(sharedScope.keySeed);
  STATE_SHARED_KEY_MAP.set(state, keySeed);
  sharedScope.keySeed = keySeed;
  return keySeed;
}

export function mapSharedState(sharedKey: number, sharedState: Dict) {
  SHARED_KEY_STATE_MAP.set(sharedKey, sharedState);
  // 代理后的 sharedState 也记录下对应的 sharedKey
  STATE_SHARED_KEY_MAP.set(sharedState, sharedKey);
}

export function getSharedState(sharedKey: number) {
  return SHARED_KEY_STATE_MAP.get(sharedKey);
}

export function recordMod(sharedState: Dict, options: IInnerCreateOptions) {
  const { rootState, help } = getHeluxRoot();
  const { forGlobal, moduleName } = options;
  const treeKey = moduleName || getSharedKey(sharedState);
  if (rootState[treeKey] && !isDebug()) {
    return console.error(`moduleName ${moduleName} duplicate!`);
  }
  // may hot replace for dev mode or add new mod
  rootState[treeKey] = sharedState;
  const internal = getInternal(sharedState);
  help.mod[treeKey] = { setState: internal.setState };

  if (forGlobal) {
    setGlobalInternal(internal);
  }
}

export function setWatcher(selfShared: SharedDict, watch: SharedDict[]) {
  watch.forEach((watchingTarget) => {
    const watchers = safeMapGet(BEENING_WATCHED_MAP, watchingTarget, [] as SharedDict[]);
    watchers.push(selfShared);
  });
}

export function getWatchers(changedShared: SharedDict) {
  const watcherList = BEENING_WATCHED_MAP.get(changedShared) || [];
  return watcherList;
}
