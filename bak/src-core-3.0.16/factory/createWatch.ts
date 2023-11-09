import { SCOPE_TYPE, WATCH } from '../consts';
import { markFnEnd, markFnStart, registerFn } from '../helpers/fnCtx';
import { recordFnDepKeys } from '../helpers/fnDep';
import { getInternal } from '../helpers/state';
import type { Fn, IFnCtx, IWatchFnParams, ScopeType, SharedState, WatchDepFn, WatchOptionsType } from '../types';
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

export function createWatchLogic<T = SharedState>(
  watchFn: (fnParams: IWatchFnParams) => void,
  options: { scopeType: ScopeType; fnCtxBase?: IFnCtx; immediate?: boolean; dep?: Fn; sharedState?: T },
) {
  const { scopeType, fnCtxBase, immediate, dep = noop, sharedState } = options;
  if (!isFn(watchFn)) {
    throw new Error('ERR_NON_FN: pass an non-function to watch!');
  }

  const fnCtx = registerFn(watchFn, { specificProps: { scopeType, fnType: WATCH }, fnCtxBase });
  const list = dep() || [];

  markFnStart(fnCtx.fnKey, sharedState);
  if (immediate) {
    watchFn({ isFirstCall: true });
  }
  if (Array.isArray(list)) {
    list.forEach((sharedState: any) => {
      const internal = getInternal(sharedState);
      if (internal) {
        const { sharedKey } = internal;
        recordFnDepKeys([`${sharedKey}`], { sharedKey });
      }
    });
  }
  markFnEnd();

  return fnCtx;
}

export function watch(watchFn: (fnParams: IWatchFnParams) => void, options?: WatchOptionsType) {
  const { dep, immediate } = parseOptions(options);
  createWatchLogic(watchFn, { scopeType: SCOPE_TYPE.STATIC, dep, immediate });
}
