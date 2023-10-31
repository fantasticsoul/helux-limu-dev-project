import { createFnCtx } from './common/derived';
import type { IAsyncTaskParams, ICreateDerivedLogicOptions, PlainObject } from '../types';

export function createDerivedAsyncLogic<S extends any = any, T extends PlainObject = PlainObject>(
  sourceFn: () => { source: S; initial: T },
  deriveFn: (taskParams: IAsyncTaskParams) => Promise<T>,
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = createFnCtx({ ...(options || {}), sourceFn, deriveFn, isAsync: true, asyncType: 'source' });
  return fnCtx;
}

export function deriveAsync<S extends any = any, T extends PlainObject = PlainObject>(
  sourceFn: () => { source: S; initial: T },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<T>,
): T {
  const fnCtx = createDerivedAsyncLogic<S, T>(sourceFn, deriveFn);
  return fnCtx.proxyResult as T;
}
