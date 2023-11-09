import { getInternal, recordMod } from '../../helpers/state';
import type { Dict, ICreateOptions } from '../../types';
import { markFnExpired } from '../common/fnScope';
import { clearInternal } from '../common/internal';
import { mapSharedToInternal } from './mapShared';
import { buildSharedState } from './buildShared';
import { configMutateFns } from './mutateFn';
import { IInnerOptions, parseOptions } from './parse';
export { prepareDeepMutate } from './mutateDeep';
export { prepareNormalMutate } from './mutateNormal';

/**
 * 创建共享对象
 */
export function buildSharedObject<T = Dict>(
  innerOptions: IInnerOptions,
  createOptions?: ICreateOptions<T>,
) {
  const parsedOptions = parseOptions(innerOptions, createOptions);
  const sharedState = buildSharedState(parsedOptions);
  mapSharedToInternal(sharedState, parsedOptions);
  recordMod(sharedState, parsedOptions);
  markFnExpired();
  configMutateFns(sharedState, parsedOptions.mutateFns);

  const internal = getInternal(sharedState);
  clearInternal(parsedOptions.moduleName, internal.loc);
  return { sharedState, internal, parsedOptions };
}
