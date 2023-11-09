import type { Fn, SharedDict } from '../types';
import { checkShared } from '../factory/common/check';
import { callAsyncMutateFnLogic, callMutateFnLogic } from '../factory/creator/mutateFn';

export function createMutate<T = SharedDict>(sharedState: T, fn: Fn, desc = '') {
  checkShared(sharedState, 'createMutate');
  return (...args: any[]) => {
    return callMutateFnLogic(
      sharedState,
      { fn, desc, getFnArgs: ({ draft, setState, desc }) => [{ draft, setState, desc, args }] },
    );
  }
}

export function createAsyncMutate<T = SharedDict>(sharedState: T, task: Fn, desc = '') {
  checkShared(sharedState, 'createAsyncMutate');
  return (...args: any[]) => {
    return callAsyncMutateFnLogic(
      sharedState,
      { task, desc, getTaskArgs: ({ setState, desc }) => [{ setState, desc, args }] },
    );
  }
}
