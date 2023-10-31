import { createFnCtx } from './common/derived';
import type { PlainObject, ICreateDerivedLogicOptions, IFnParams } from '../types';

export function createDerivedTaskLogic<R extends PlainObject = PlainObject>(
  deriveFn: (taskParams: IFnParams) => {
    initial: R;
    task: () => Promise<R>;
  },
  options?: ICreateDerivedLogicOptions,
) {
  const fnCtx = createFnCtx({ ...(options || {}), deriveFn, isAsync: true, asyncType: 'task' });
  return fnCtx;
}

export function createDerivedTask<R extends PlainObject = PlainObject>(
  deriveFn: (taskParams: IFnParams) => {
    initial: R;
    task: () => Promise<R>;
  },
): R {
  const fnCtx = createDerivedTaskLogic(deriveFn);
  // @ts-ignore
  return fnCtx.proxyResult;
}
