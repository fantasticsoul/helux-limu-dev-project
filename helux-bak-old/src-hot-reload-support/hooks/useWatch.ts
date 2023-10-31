import { useEffect, useRef, useState } from 'react';
import { MOUNTED } from '../consts';
import { createWatchLogic } from '../factory/createWatch';
import * as fnDep from '../helpers/fndep';
import { isFn } from '../utils';
import type { DerivedFn, DerivedResult, Dict } from '../types';

export function useWatch<T extends Dict = Dict>(watchFn: DerivedResult<T> | DerivedFn<T>) {
  const fnRef = useRef<any>(null);
  const [fnCtx] = useState(() => fnDep.buildFnCtx());

  if (!fnRef.current) {
    // 传入了局部的自定义观察函数
    if (!isFn(watchFn)) {
      throw new Error('ERR_NON_WATCH_FN: useWatch only accept function');
    }
    fnRef.current = watchFn;
    createWatchLogic(fnRef.current, { scopeType: 'hook', fnCtxBase: fnCtx });
  }

  useEffect(() => {
    fnCtx.mountStatus = MOUNTED;
    fnDep.recoverDep(fnCtx);
    return () => {
      fnDep.delFnCtx(fnCtx);
    };
  }, [fnCtx]);
}
