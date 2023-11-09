import { ASYNC_TYPE } from '../consts';
import type {
  DeriveAtomFn,
  DerivedAtom,
  DerivedResult,
  DeriveFn,
  Dict,
  IAsyncTaskParams,
  IDeriveFnParams,
  PlainObject,
  ReadDep,
} from '../types';
import { getAtomTuple, getTuple, useDerivedLogic } from './common/useDerivedLogic';

const { SOURCE, TASK } = ASYNC_TYPE;

export function useDerived<R = PlainObject>(resultOrFn: DerivedResult<R> | DeriveFn<R>, readDep: ReadDep = false) {
  const fnCtx = useDerivedLogic({ fn: resultOrFn, readDep });
  return getTuple<R>(fnCtx);
}

export function useDerivedAsync<S = any, R = PlainObject>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S, R>) => Promise<R>,
  readDep: ReadDep = false,
) {
  const fnCtx = useDerivedLogic({ readDep, fn: deriveFn, sourceFn, showProcess: true, asyncType: SOURCE });
  return getTuple<R>(fnCtx);
}

export function useDerivedTask<R = Dict>(
  deriveFn: (taskParams: IDeriveFnParams) => { initial: R; task: () => Promise<R> },
  readDep: ReadDep = false,
) {
  const fnCtx = useDerivedLogic({ readDep, fn: deriveFn, showProcess: true, asyncType: TASK });
  return getTuple<R>(fnCtx);
}

export function useAtomDerived<R = any>(resultOrFn: DerivedAtom<R> | DeriveAtomFn<R>) {
  const fnCtx = useDerivedLogic({ fn: resultOrFn, forAtom: true });
  return getAtomTuple<R>(fnCtx);
}

export function useAtomDerivedAsync<S = any, R = any>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S, R>) => Promise<R>,
) {
  const fnCtx = useDerivedLogic({ fn: deriveFn, sourceFn, showProcess: true, asyncType: SOURCE, forAtom: true });
  return getAtomTuple<R>(fnCtx);
}

export function useAtomDerivedTask<R = any>(
  deriveFn: (taskParams: IDeriveFnParams<R>) => { initial: R; task: () => Promise<R> },
) {
  const fnCtx = useDerivedLogic({ fn: deriveFn, showProcess: true, asyncType: TASK, forAtom: true });
  return getAtomTuple<R>(fnCtx);
}
