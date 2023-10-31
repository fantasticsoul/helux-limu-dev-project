import { useEffect, useRef, useState } from 'react';
import { MOUNTED, RENDER_END, RENDER_START } from '../consts';
import { buildFnCtx, delFnCtx, getDepSharedStateFeature, recoverDep } from '../helpers/fndep';
import { attachInsDerivedResult } from '../helpers/ins';
import { DerivedFn, DerivedResult, IsComputing, PlainObject, Dict } from '../types';
import { noop } from '../utils';
import { initDerivedResult, IUseDerivedOptions } from './common/derived';
import { useSync } from './common/useSync';
import { useForceUpdate } from './useForceUpdate';

export function useDerivedLogic<T extends any = any>(options: IUseDerivedOptions): [T, IsComputing] {
  const { fn, sourceFn = noop, enableRecordResultDep = false, careDeriveStatus, asyncType = 'normal' } = options;
  const deriveCtxRef = useRef({ input: fn, deriveFn: null });
  const updater = useForceUpdate();
  const [fnCtx] = useState(() => {
    console.error('call buildFnCtx');
    return buildFnCtx({ updater, enableRecordResultDep, scopeType: 'hook' });
  });
  fnCtx.renderStatus = RENDER_START;
  initDerivedResult({ deriveCtx: deriveCtxRef.current, careDeriveStatus, fn, sourceFn, fnCtx, asyncType });
  console.log(`---> fnCtx.fnKey ${fnCtx.fnKey}`);

  if (fnCtx.enableRecordResultDep) {
    fnCtx.isResultReaded = false; // 待到 proxy 里产生读取行为时，会被置为 true
  }
  if (fnCtx.shouldReplaceResult) {
    console.error('call attachInsDerivedResult for fnCtx.shouldReplaceResult = true');
    attachInsDerivedResult(fnCtx);
    fnCtx.shouldReplaceResult = false;
  }

  useSync(fnCtx.subscribe, () => getDepSharedStateFeature(fnCtx));

  useEffect(() => {
    fnCtx.renderStatus = RENDER_END;
  });

  useEffect(() => {
    fnCtx.mountStatus = MOUNTED;
    recoverDep(fnCtx);
    return () => {
      delFnCtx(fnCtx);
    };
  }, [fnCtx]);

  return [fnCtx.proxyResult, fnCtx.isComputing];
}

export function useDerived<T extends PlainObject = PlainObject>(
  resultOrFn: DerivedResult<T> | DerivedFn<T>,
  enableRecordResultDep?: boolean,
): [T, IsComputing] {
  const resultPair = useDerivedLogic({ fn: resultOrFn, enableRecordResultDep });
  return resultPair;
}
