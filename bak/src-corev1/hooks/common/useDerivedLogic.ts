import { MOUNTED, RENDER_END, RENDER_START, SCOPE_TYPE } from '../../consts';
import { buildFnCtx, delFnCtx } from '../../helpers/fnCtx';
import { getDepSharedStateFeature, recoverDep } from '../../helpers/fnDep';
import { attachInsDerivedResult } from '../../helpers/insCtx';
import { react } from '../../react';
import type { IFnCtx, IRenderInfo, IsComputing } from '../../types';
import { noop } from '../../utils';
import { useForceUpdate } from '../useForceUpdate';
import { genDerivedResult, IUseDerivedLogicOptions } from './derived';
import { useSync } from './useSync';

function useFnCtx(options: IUseDerivedLogicOptions): IFnCtx {
  const { fn, sourceFn = noop, readDep = false, showProcess, asyncType, forAtom } = options;
  const updater = useForceUpdate();
  const deriveCtxRef = react.useRef({ input: fn, deriveFn: null });
  const [fnCtx] = react.useState(() => {
    return buildFnCtx({ updater, readDep, scopeType: SCOPE_TYPE.HOOK, forAtom });
  });
  fnCtx.renderStatus = RENDER_START;
  genDerivedResult({ deriveCtx: deriveCtxRef.current, showProcess, fn, sourceFn, fnCtx, asyncType, forAtom });

  return fnCtx;
}

function useReadBehavior(fnCtx: IFnCtx) {
  if (fnCtx.readDep) {
    fnCtx.isReaded = false; // 待到 proxy 里产生读取行为时，会被置为 true
  }
  if (fnCtx.shouldReplaceResult) {
    attachInsDerivedResult(fnCtx);
    fnCtx.shouldReplaceResult = false;
  }
  // adapt to react 18
  useSync(fnCtx.subscribe, () => getDepSharedStateFeature(fnCtx));
  react.useEffect(() => {
    fnCtx.renderStatus = RENDER_END;
  });
}

function useDelFnCtxEffect(fnCtx: IFnCtx) {
  react.useEffect(() => {
    fnCtx.mountStatus = MOUNTED;
    recoverDep(fnCtx);
    return () => {
      delFnCtx(fnCtx);
    };
  }, [fnCtx]);
}

export function getTuple<R>(fnCtx: IFnCtx): [R, IsComputing, IRenderInfo] {
  return [fnCtx.proxyResult as R, fnCtx.isComputing, fnCtx.renderInfo];
}

export function getAtomTuple<R>(fnCtx: IFnCtx): [R, IsComputing, IRenderInfo] {
  return [fnCtx.proxyResult.val as R, fnCtx.isComputing, fnCtx.renderInfo];
}

/**
 * 裁剪后的 useSharedLogic，供 signal 模块 调用
 */
export function useDerivedSimpleLogic(options: IUseDerivedLogicOptions): IFnCtx {
  const fnCtx = useFnCtx(options);
  useSync(fnCtx.subscribe, () => getDepSharedStateFeature(fnCtx));
  useDelFnCtxEffect(fnCtx);
  return fnCtx;
}

export function useDerivedLogic(options: IUseDerivedLogicOptions): IFnCtx {
  const fnCtx = useFnCtx(options);
  useReadBehavior(fnCtx);
  useDelFnCtxEffect(fnCtx);
  return fnCtx;
}
