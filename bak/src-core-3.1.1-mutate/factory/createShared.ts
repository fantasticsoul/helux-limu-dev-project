import { useShared, useAtom } from '../hooks/useShared';
import type { Dict, Fn, IAtomCtx, ICreateOptions, IAtomCreateOptions, ISharedCtx } from '../types';
import { initGlobalLoading, initLoadingCtx } from './creator/loading';
import { getGlobalEmpty, initGlobalEmpty } from './creator/globalId';
import { buildSharedObject } from './creator';
import type { IInnerOptions } from './creator/parse';
import { action, actionAsync, atomAction, atomActionAsync } from './createAction';
import { STATE_TYPE } from '../consts';

const { USER_STATE } = STATE_TYPE;

export function ensureGlobal(inputStateType?: string) {
  const stateType = inputStateType || USER_STATE;
  if (USER_STATE === stateType && !getGlobalEmpty()) {
    initGlobalEmpty(createSharedLogic);
    initGlobalLoading(createSharedLogic);
  }
}

export function createSharedLogic(innerOptions: IInnerOptions, createOptions?: any): any {
  ensureGlobal(innerOptions.stateType);
  const { sharedState: state, internal } = buildSharedObject(innerOptions, createOptions);
  const { syncer, sync, forAtom, setDraft: setState } = internal;
  const useFn: any = forAtom ? useAtom : useShared;
  const actionCreator = forAtom ? atomAction(state) : action(state);
  const asyncActionCreator = forAtom ? atomActionAsync(state) : actionAsync(state);
  const { sharedLoading, useLoading } = initLoadingCtx(createSharedLogic, internal);

  return {
    state,
    loading: sharedLoading,
    setState,
    action: actionCreator,
    asyncAction: asyncActionCreator,
    call: (fn: Fn, ...args: any[]) => actionCreator(state)(fn)(...args),
    asyncCall: (fn: Fn, ...args: any[]) => asyncActionCreator(state)(fn)(...args),
    useState: (options?: any) => useFn(state, options),
    useLoading,
    sync,
    syncer,
  };
}

/** expose share ctx as object */
export function shareState<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(
  rawState: T | (() => T), options?: O,
): ISharedCtx<T, O> {
  return createSharedLogic({ rawState }, options);
}

/** expose atom ctx as object */
export function shareAtom<T = any, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(
  rawState: any | (() => any), options?: O,
): IAtomCtx<T, O> {
  return createSharedLogic({ rawState, forAtom: true }, options);
}

/** expose share ctx as tuple */
export function share<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(rawState: T | (() => T), options?: O) {
  const ctx = createSharedLogic({ rawState }, options) as ISharedCtx<T, O>;
  return [ctx.state, ctx.setState, ctx] as const;
}

/**
 * expose atom ctx as tuple，支持共享 primitive 类型值
 */
export function atom<T = any, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(rawState: T | (() => T), options?: O) {
  const ctx = createSharedLogic({ rawState, forAtom: true }, options) as IAtomCtx<T, O>;
  return [ctx.state, ctx.setState, ctx] as const;
}
