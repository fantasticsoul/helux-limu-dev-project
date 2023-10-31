import { useEffect, useRef, useState } from 'react';
import { MOUNTED, SCOPE_TYPE } from '../consts';
import { createWatchLogic } from '../factory/createWatch';
import { buildFnCtx, delFnCtx } from '../helpers/fnCtx';
import { recoverDep } from '../helpers/fnDep';
import type { Dict, Fn } from '../types';
import { isFn } from '../utils';

export function useWatch<T extends Dict = Dict>(watchFn: Fn) {
  const fnRef = useRef<any>(null);
  const [fnCtx] = useState(() => buildFnCtx());

  if (!fnRef.current) {
    // 传入了局部的自定义观察函数
    if (!isFn(watchFn)) {
      throw new Error('ERR_NON_WATCH_FN: useWatch only accept function');
    }
    fnRef.current = watchFn;
    createWatchLogic(fnRef.current, { scopeType: SCOPE_TYPE.HOOK, fnCtxBase: fnCtx });
  }

  useEffect(() => {
    fnCtx.mountStatus = MOUNTED;
    recoverDep(fnCtx);
    return () => {
      delFnCtx(fnCtx);
    };
  }, [fnCtx]);
}
