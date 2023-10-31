import { ASYNC_TYPE } from '../consts';
import { useDerivedLogic } from './useDerived';
import type { Dict, IFnParams, IsComputing } from '../types';

export function useDerivedTask<R extends Dict = Dict>(
  deriveFn: (taskParams: IFnParams) => {
    initial: R;
    task: () => Promise<R>;
  },
  enableRecordResultDep?: boolean,
): [R, IsComputing] {
  const resultPair = useDerivedLogic({
    fn: deriveFn, enableRecordResultDep, careDeriveStatus: true, asyncType: ASYNC_TYPE.TASK,
  });
  return resultPair;
}
