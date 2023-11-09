import { getInternal, recordMod, setWatcher } from '../../helpers/state';
import { markFnExpired } from '../common/fnScope';
import { clearInternal } from '../common/internal';
import { parseRawState } from './parse';
import { getHeluxParams } from './param';
import { buildSharedState } from './buildShared';
import { bindInternalToShared } from './bindInternal';
import type { Dict, IInnerCreateOptions } from '../../types';
import { configChangeFns, runMutateRules } from './mutateRule';
export { prepareDeepMutate } from './mutateDeep';
export { prepareNormalMutate } from './mutateNormal';
export { configChangeFns, runMutateRules };

/**
 * 创建共享对象
 */
export function buildSharedObject<T extends Dict = Dict>(stateOrStateFn: T | (() => T), options: IInnerCreateOptions) {
  const rawState = parseRawState(stateOrStateFn);
  const heluxParams = getHeluxParams(rawState, options);
  const sharedState = buildSharedState(heluxParams);
  bindInternalToShared(sharedState, heluxParams);
  recordMod(sharedState, options);
  markFnExpired();
  setWatcher(sharedState, options.watch);
  configChangeFns(sharedState, options.change);
  
  const internal = getInternal(sharedState);
  clearInternal(options.moduleName, internal.loc);
  return { sharedState, internal };
}
