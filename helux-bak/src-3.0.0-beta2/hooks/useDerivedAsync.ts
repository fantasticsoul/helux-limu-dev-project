import { ASYNC_TYPE } from '../consts';
import { useDerivedLogic } from './useDerived';
import type { IAsyncTaskParams, IsComputing, PlainObject } from '../types';

export function useDerivedAsync<S extends any = any, R extends PlainObject = PlainObject>(
  sourceFn: () => ({ source: S; initial: R }),
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
  enableRecordResultDep?: boolean,
): [R, IsComputing] {
  const resultPair = useDerivedLogic({
    fn: deriveFn, sourceFn, enableRecordResultDep, careDeriveStatus: true, asyncType: ASYNC_TYPE.SOURCE,
  });
  return resultPair;
}
