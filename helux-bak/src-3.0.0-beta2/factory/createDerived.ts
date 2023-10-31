import { createFnCtx } from './common/derived';
import type { IFnCtx, IFnParams, PlainObject, ScopeType } from '../types';

export function createDerivedLogic<T extends PlainObject = PlainObject>(
  deriveFn: (params: IFnParams<T>) => T,
  options?: { scopeType?: ScopeType; fnCtxBase?: IFnCtx },
) {
  const fnCtx = createFnCtx({ ...(options || {}), sourceFn: deriveFn, deriveFn, isAsync: false });
  return fnCtx;
}

/**
 * 创建一个普通的派生新结果的任务
 */
export function derive<T extends PlainObject = PlainObject>(deriveFn: (params: IFnParams) => T): T {
  const fnCtx = createDerivedLogic<T>(deriveFn);
  return fnCtx.proxyResult as T;
}
