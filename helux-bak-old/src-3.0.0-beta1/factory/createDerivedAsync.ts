import { createFnCtx } from './common/derived';
import type { IAsyncTaskParams, ICreateDerivedLogicOptions, PlainObject } from '../types';

export function createDerivedAsyncLogic<S extends any = any, R extends PlainObject = PlainObject>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams) => Promise<R>,
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = createFnCtx({ ...(options || {}), sourceFn, deriveFn, isAsync: true, asyncType: 'source' });
  return fnCtx;
}

export function deriveAsync<S extends any = any, R extends PlainObject = PlainObject>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): R {
  const fnCtx = createDerivedAsyncLogic<S, R>(sourceFn, deriveFn);
  return fnCtx.proxyResult as R;
}
