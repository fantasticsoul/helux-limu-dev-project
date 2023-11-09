import { SCOPE_TYPE, WATCH } from '../consts';
import { markFnEnd, markFnStart, registerFn } from '../helpers/fnCtx';
import { recordFnDepKeys } from '../helpers/fnDep';
import { getInternal } from '../helpers/state';
import type { Fn, IFnCtx, IWatchFnParams, ScopeType, SharedState, WatchDepFn, WatchOptionsType } from '../types';
import { isFn, isObj, noop } from '../utils';

export function parseOptions(options?: WatchOptionsType) {
  let deps: WatchDepFn = noop;
  let immediate: boolean = true;
  if (isFn(options)) {
    deps = options;
  } else if (isObj(options)) {
    deps = options.deps || noop;
    immediate = options.immediate ?? true;
  }
  return { immediate, deps };
}

export function createWatchLogic<T = SharedState>(
  watchFn: (fnParams: IWatchFnParams) => void,
  options: { scopeType: ScopeType; fnCtxBase?: IFnCtx; immediate?: boolean; deps?: Fn; sharedState?: T },
) {
  const { scopeType, fnCtxBase, immediate, deps = noop, sharedState } = options;
  if (!isFn(watchFn)) {
    throw new Error('ERR_NON_FN: pass an non-function to watch!');
  }

  const fnCtx = registerFn(watchFn, { specificProps: { scopeType, fnType: WATCH }, fnCtxBase });
  markFnStart(fnCtx.fnKey, sharedState);
  const list = deps() || [];
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
  const { deps, immediate } = parseOptions(options);
  createWatchLogic(watchFn, { scopeType: SCOPE_TYPE.STATIC, deps, immediate });
}
