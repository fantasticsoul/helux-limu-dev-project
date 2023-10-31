import { useEffect, useRef } from 'react';
import { IS_SHARED, MOUNTED, RENDER_END, RENDER_START, SKIP_MERGE } from '../consts';
import { attachInsProxyState, buildInsCtx } from '../helpers/ins';
import { clearDep, recoverDep, resetReadMap, updateDep } from '../helpers/insdep';
import { getInternal, getRawState } from '../helpers/state';
import { isFn } from '../utils';
import { useSync } from './common/useSync';
import { useObjectLogic } from './useObject';
import type { InsCtxDef } from '../factory/common/buildInternal';
import type { Dict, IUseSharedOptions } from '../types';

// for skip ts check that after if block
const nullInsCtx = null as unknown as InsCtxDef;

function checkStateVer(insCtx: InsCtxDef, options: IUseSharedOptions) {
  const {
    ver,
    internal: { ver: dataVer },
  } = insCtx;
  if (ver !== dataVer) {
    // 替换 proxyState，让把共享对象透传给 memo 组件的场景也能正常触发重新渲染
    insCtx.ver = dataVer;
    attachInsProxyState(insCtx, options.enableReactive);
  }
}

// recover ins ctx (dep,updater etc...) for double mount behavior under react strict mode
function recoverInsCtx(insCtx: InsCtxDef) {
  insCtx.internal.recordId(insCtx.insKey, insCtx.id);
  recoverDep(insCtx);
}

function clearInsCtx(insCtx: InsCtxDef) {
  insCtx.internal.delId(insCtx.insKey, insCtx.id);
  clearDep(insCtx);
}

/** 如已经设置 staticDeps， extraDeps 将不会执行 */
function readExtraDeps(insCtx: InsCtxDef, options: IUseSharedOptions) {
  if (insCtx.hasStaticDeps) {
    return;
  }
  if (isFn(options.extraDeps)) {
    options.extraDeps(insCtx.proxyState);
  }
}

/**
 * with hot-reload mode, shared key may be changed
 */
function isSharedKeyChanged<T extends Dict = Dict>(insCtx: InsCtxDef, sharedState: T) {
  const curSharedKey = getInternal(sharedState).sharedKey;
  return insCtx.internal.sharedKey !== curSharedKey;
}

export function useShared<T extends Dict = Dict>(
  sharedState: T,
  options: IUseSharedOptions<T> = {},
): [T, (partialState: Partial<T>) => void, Dict] {
  const rawState = getRawState(sharedState);

  const [, setState] = useObjectLogic(rawState, { force: true, [IS_SHARED]: true, [SKIP_MERGE]: true });
  const ctxRef = useRef<{ ctx: InsCtxDef }>({ ctx: nullInsCtx });

  // start build or rebuild ins ctx
  let insCtx = ctxRef.current.ctx;
  if (!insCtx || isSharedKeyChanged(insCtx, sharedState)) {
    insCtx = buildInsCtx({ setState, sharedState, ...options });
    ctxRef.current.ctx = insCtx;
  }

  insCtx.renderStatus = RENDER_START;
  resetReadMap(insCtx);
  readExtraDeps(insCtx, options);

  useSync(insCtx.subscribe, () => getInternal(sharedState).rawStateSnap);

  // start update dep in every render period
  useEffect(() => {
    insCtx.renderStatus = RENDER_END;
    updateDep(insCtx);
  });

  useEffect(() => {
    insCtx.mountStatus = MOUNTED;
    recoverInsCtx(insCtx);
    return () => {
      clearInsCtx(insCtx);
    };
  }, [insCtx]);

  checkStateVer(insCtx, options);
  const debugInfo = { sharedKey: insCtx.internal.sharedKey };
  return [insCtx.proxyState, insCtx.internal.setState, debugInfo];
}
