import { SCOPE_TYPE, WATCH } from '../consts';
import * as fnDep from '../helpers/fnDep';
import { delRunninFnKey } from './common/fnScope';
import { getInternal } from '../helpers/state';
import { mapFn } from '../helpers/fnCtx';
import type { Fn, IFnCtx, SharedState, IWatchFnParams, ScopeType, WatchDepFn, WatchOptionsType } from '../types';
import { isFn, isObj, noop } from '../utils';

export function parseOptions(options?: WatchOptionsType) {
  let dep: WatchDepFn = noop;
  let immediate: boolean = true;
  if (isFn(options)) {
    dep = options;
  } else if (isObj(options)) {
    dep = options.dep || noop;
    immediate = options.immediate ?? true;
  }
  return { immediate, dep };
}

export function createWatchLogic(
  watchFn: (fnParams: IWatchFnParams) => void,
  options: { scopeType: ScopeType; fnCtxBase?: IFnCtx; immediate?: boolean; dep?: Fn; sharedState?: SharedState },
) {
  const { scopeType, fnCtxBase, immediate, dep = noop, sharedState } = options;
  if (!isFn(watchFn)) {
    throw new Error('ERR_NON_FN: pass an non-function to watch!');
  }

  const fnCtx = mapFn(watchFn, { specificProps: { scopeType, fnType: WATCH }, fnCtxBase, sharedState });
  const list = dep() || [];
  if (immediate) {
    watchFn({ isFirstCall: true });
  }
  if (Array.isArray(list)) {
    list.forEach((sharedState: any) => {
      const internal = getInternal(sharedState);
      if (internal) {
        const { sharedKey } = internal;
        fnDep.recordFnDepKey(`${sharedKey}`, { sharedKey });
      }
    });
  }
  delRunninFnKey();

  return fnCtx;
}

export function watch(watchFn: (fnParams: IWatchFnParams) => void, options?: WatchOptionsType) {
  const { dep, immediate } = parseOptions(options);
  createWatchLogic(watchFn, { scopeType: SCOPE_TYPE.STATIC, dep, immediate });
}
