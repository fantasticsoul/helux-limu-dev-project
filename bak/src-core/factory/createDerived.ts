import { ASYNC_TYPE } from '../consts';
import type { Atom, IAsyncTaskParams, ICreateDerivedLogicOptions, IDeriveFnParams, IFnCtx, PlainObject, ScopeType } from '../types';
import { initDeriveFn } from './common/derived';

const { TASK } = ASYNC_TYPE;

export function createDerivedLogic<R extends any = any>(
  fn: (params: IDeriveFnParams<R>) => R,
  options?: { scopeType?: ScopeType; fnCtxBase?: IFnCtx; forAtom?: boolean },
) {
  const fnCtx = initDeriveFn({ ...(options || {}), fn, isAsync: false });
  return fnCtx;
}

export function createDerivedAsyncLogic<S extends any = any, R extends any = any>(
  taskInfo: {
    fn: () => R;
    deps?: () => any[];
    task: (fnParam: IAsyncTaskParams<S>) => R;
  },
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = initDeriveFn({ ...(options || {}), ...taskInfo, isAsync: true, asyncType: TASK });
  return fnCtx;
}

/**
 * 创建一个普通的派生新结果的任务
 */
export function derive<R = PlainObject>(deriveFn: (params: IDeriveFnParams) => R): R {
  const fnCtx = createDerivedLogic<R>(deriveFn);
  return fnCtx.proxyResult as R;
}

// sourceFn: () => { source: S; initial: R },
// deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
export function deriveAsync<S = any, R = PlainObject>(taskInfo: {
  fn: () => R;
  deps?: () => any[];
  task: (fnParam: IAsyncTaskParams<S>) => R;
}): R {
  const fnCtx = createDerivedAsyncLogic<S, R>(taskInfo);
  return fnCtx.proxyResult as R;
}

/**
 * 创建一个普通的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtom<R = any>(deriveFn: (params: IDeriveFnParams<R>) => R): Atom<R> {
  const fnCtx = createDerivedLogic<R>(deriveFn, { forAtom: true });
  return fnCtx.proxyResult as Atom<R>;
}

/**
 * 创建一个异步的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtomAsync<S = any, R = any>(taskInfo: {
  fn: () => R;
  deps?: () => any[];
  task: (fnParam: IAsyncTaskParams<S>) => R;
}): Atom<R> {
  const fnCtx = createDerivedAsyncLogic<S, R>(taskInfo, { forAtom: true });
  return fnCtx.proxyResult as Atom<R>;
}
