import { ASYNC_TYPE } from '../consts';
import type { Atom, IAsyncTaskParams, ICreateDerivedLogicOptions, IDeriveFnParams, IFnCtx, PlainObject, ScopeType } from '../types';
import { initDeriveFn } from './common/derived';

const { TASK, SOURCE } = ASYNC_TYPE;

export function createDerivedLogic<R extends any = any>(
  deriveFn: (params: IDeriveFnParams<R>) => R,
  options?: { scopeType?: ScopeType; fnCtxBase?: IFnCtx; forAtom?: boolean },
) {
  const fnCtx = initDeriveFn({ ...(options || {}), sourceFn: deriveFn, deriveFn, isAsync: false });
  return fnCtx;
}

export function createDerivedAsyncLogic<S extends any = any, R extends any = any>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams) => Promise<R>,
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = initDeriveFn({ ...(options || {}), sourceFn, deriveFn, isAsync: true, asyncType: SOURCE });
  return fnCtx;
}

export function createDerivedTaskLogic<R extends any = any>(
  deriveFn: (taskParams: IDeriveFnParams) => { initial: R; task: () => Promise<R> },
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = initDeriveFn({ ...(options || {}), deriveFn, isAsync: true, asyncType: TASK });
  return fnCtx;
}

/**
 * 创建一个普通的派生新结果的任务
 */
export function derive<R = PlainObject>(deriveFn: (params: IDeriveFnParams) => R): R {
  const fnCtx = createDerivedLogic<R>(deriveFn);
  return fnCtx.proxyResult as R;
}

export function deriveAsync<S = any, R = PlainObject>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): R {
  const fnCtx = createDerivedAsyncLogic<S, R>(sourceFn, deriveFn);
  return fnCtx.proxyResult as R;
}

export function deriveTask<R = PlainObject>(
  deriveFn: (taskParams: IDeriveFnParams) => { initial: R; task: () => Promise<R> },
  immediate?: boolean,
): R {
  const fnCtx = createDerivedTaskLogic<R>(deriveFn, { immediate });
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
export function deriveAtomAsync<S = any, R = any>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): Atom<R> {
  const fnCtx = createDerivedAsyncLogic<S, R>(sourceFn, deriveFn, { forAtom: true });
  return fnCtx.proxyResult as Atom<R>;
}

/**
 * 创建一个异步的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtomTask<R = any>(
  deriveFn: (taskParams: IDeriveFnParams<R>) => { initial: R; task: () => Promise<R> },
): Atom<R> {
  const fnCtx = createDerivedTaskLogic(deriveFn, { forAtom: true });
  return fnCtx.proxyResult as Atom<R>;
}
