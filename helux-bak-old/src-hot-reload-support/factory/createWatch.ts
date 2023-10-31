import * as fnDep from '../helpers/fndep';
import { isFn } from '../utils';
import type { IFnCtx, IWatchFnParams } from '../types';

export function createWatchLogic(watchFn: (fnParams: IWatchFnParams) => void, options: { scopeType: 'static' | 'hook'; fnCtxBase?: IFnCtx }) {
  const { scopeType, fnCtxBase } = options;

  if (!isFn(watchFn)) {
    throw new Error('ERR_NON_FN: pass an non-function to createWatch!');
  }

  const fnCtx = fnDep.mapFn(watchFn, { specificProps: { scopeType, fnType: 'watch' }, fnCtxBase });
  watchFn({ isFirstCall: true });
  fnDep.delRunninFnKey();

  return fnCtx;
}

export function createWatch(watchFn: (fnParams: IWatchFnParams) => void) {
  createWatchLogic(watchFn, { scopeType: 'static' });
}
