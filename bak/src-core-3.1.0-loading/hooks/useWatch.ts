import { MOUNTED, SCOPE_TYPE } from '../consts';
import { createWatchLogic, parseOptions } from '../factory/createWatch';
import { buildFnCtx, delFnCtx } from '../helpers/fnCtx';
import { recoverDep } from '../helpers/fnDep';
import { react } from '../react';
import type { Fn, WatchOptionsType } from '../types';
import { isFn } from '../utils';

export function useWatch(watchFn: Fn, options: WatchOptionsType) {
  const fnRef = react.useRef<any>(null);
  const [fnCtx] = react.useState(() => buildFnCtx());

  if (!fnRef.current) {
    // 传入了局部的自定义观察函数
    if (!isFn(watchFn)) {
      throw new Error('ERR_NON_WATCH_FN: useWatch only accept function');
    }
    fnRef.current = watchFn;
    const { dep, immediate } = parseOptions(options);
    createWatchLogic(fnRef.current, { scopeType: SCOPE_TYPE.HOOK, fnCtxBase: fnCtx, dep, immediate });
  }

  react.useEffect(() => {
    fnCtx.mountStatus = MOUNTED;
    recoverDep(fnCtx);
    return () => {
      delFnCtx(fnCtx);
    };
  }, [fnCtx]);
}
