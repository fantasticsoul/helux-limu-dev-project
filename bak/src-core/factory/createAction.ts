import type { Fn, SharedState, SharedDict, Atom } from '../types';
import { checkShared } from './common/check';
import { callAsyncMutateFnLogic, callMutateFnLogic } from './creator/mutateFn';

/**
 * 内部统一封装，shared 和 atom 走统一的入口，上层接口自己标记对应类型
 */
function innerCreate<T = SharedState>(state: T, options: { fn: Fn, desc: string, label: string, forAtom?: boolean, isAsync?: boolean }) {
  const { forAtom = false, isAsync = false, fn, desc = '', label } = options;
  checkShared(state, forAtom, label);
  if (isAsync) {
    const asyncAction = (...args: any[]) => {
      return callAsyncMutateFnLogic(
        state,
        { task: fn, desc, getTaskArgs: ({ setState, desc }) => [{ setState, desc, args }] },
      );
    }; // now fn can have a name 'asyncAction' at dev mode
    asyncAction.__fnName = desc;
    return asyncAction;
  }

  const action = (...args: any[]) => {
    return callMutateFnLogic(
      state,
      { fn, desc, getFnArgs: ({ draft, setState, desc }) => [{ draft, setState, desc, args }] },
    );
  }; // now fn can have a name 'action' at dev mode
  action.__fnName = desc;
  return action;
}

export function createAction<T = SharedDict>(sharedDict: T) {
  return (fn: Fn, desc = '') => innerCreate(sharedDict, { fn, desc, label: 'createAction' });
}

export function createAsyncAction<T = SharedDict>(sharedDict: T) {
  return (fn: Fn, desc = '') => innerCreate(sharedDict, { fn, desc, label: 'createAsyncAction', isAsync: true });
}

export function createAtomAction<T = any>(atom: Atom<T>) {
  return (fn: Fn, desc = '') => innerCreate(atom, { fn, desc, label: 'createAtomAction', forAtom: true });
}

export function createAtomAsyncAction<T = any>(atom: Atom<T>) {
  return (fn: Fn, desc = '') => innerCreate(atom, { fn, desc, label: 'createAtomAsyncAction', isAsync: true, forAtom: true });
}
