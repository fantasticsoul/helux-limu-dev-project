import { getInternal, recordMod, setWatcher } from '../../helpers/state';
import type { Dict, IInnerCreateOptions } from '../../types';
import { markFnExpired } from '../common/fnScope';
import { clearInternal } from '../common/internal';
import { mapSharedToInternal } from './mapShared';
import { buildSharedState } from './buildShared';
import { configChangeFns } from './mutateRule';
import { getHeluxParams } from './param';
import { parseRawState } from './parse';
export { prepareDeepMutate } from './mutateDeep';
export { prepareNormalMutate } from './mutateNormal';
export { parseOptions } from './parse';

/**
 * 创建共享对象
 */
export function buildSharedObject<T = Dict>(stateOrStateFn: T | (() => T), options: IInnerCreateOptions) {
  const rawState = parseRawState(stateOrStateFn);
  const heluxParams = getHeluxParams(rawState, options);
  const sharedState = buildSharedState(heluxParams);
  mapSharedToInternal(sharedState, heluxParams);
  recordMod(sharedState, options);
  markFnExpired();
  setWatcher(sharedState, options.watch);
  configChangeFns(sharedState, options.changeFn);

  const internal = getInternal(sharedState);
  clearInternal(options.moduleName, internal.loc);
  return { sharedState, internal };
}
