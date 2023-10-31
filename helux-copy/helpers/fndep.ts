import { DERIVE, EXPIRE_MS, FN_KEY, NOT_MOUNT, PROTO_KEY, RENDER_START, SIZE_LIMIT, UNMOUNT, ASYNC_TYPE } from '../consts';
import { getHelp } from '../factory/root';
import type { Dict, Fn, IFnCtx, ScopeType, TriggerReason } from '../types';
import { isDebug, isFn, isObj, nodupPush, noop, safeMapGet, delListItem, getSafeNext } from '../utils';
import { injectHeluxProto } from './obj';
import { getInternalByKey } from './state';

const { MAY_TRANSFER, SOURCE } = ASYNC_TYPE;
const { fnDepScope: scope } = getHelp();
const { DEPKEY_FNKEYS_MAP, UNMOUNT_INFO_MAP, FNKEY_HOOK_CTX_MAP, FNKEY_STATIC_CTX_MAP, DEPKEY_RUNNING_FNKEYS_MAP } = scope;

function getKeySeed(scopeType: ScopeType) {
  const keySeed = getSafeNext(scope.keySeed[scopeType]);
  scope.keySeed[scopeType] = keySeed;
  return keySeed;
}

export const computeMod = {
  putRunningFnKey(depKey: string, fnKey: string) {
    const fnKeys = safeMapGet(DEPKEY_RUNNING_FNKEYS_MAP, depKey, [] as string[]);
    fnKeys.push(fnKey);
  },
  delRunningFnKey(depKey: string, fnKey: string) {
    const fnKeys = DEPKEY_RUNNING_FNKEYS_MAP.get(depKey);
    if (fnKeys) {
      delListItem(fnKeys, fnKey)
    }
  },
  shouldShowComputing(depKeys: string[]) {
    let ret = false;
    for (const depKey of depKeys) {
      const fnKeys = DEPKEY_RUNNING_FNKEYS_MAP.get(depKey) || [];
      if (fnKeys.length > 0) {
        ret = true;
        break;
      }
    }
    return ret;
  },
}

export function markFnKey(fnOrObj: Dict, scopeType: ScopeType, fnKey?: string) {
  const prefix = scopeType === 'static' ? 's' : 'h';
  const fnKeyStr = fnKey || `${prefix}${getKeySeed(scopeType)}`;
  if (isFn(fnOrObj)) {
    // @ts-ignore
    fnOrObj[FN_KEY] = fnKeyStr;
  } else {
    fnOrObj.__proto__[FN_KEY] = fnKeyStr;
  }
  return fnKeyStr;
}

export function getFnKey(fnOrObj: Dict): string {
  if (isFn(fnOrObj)) {
    // @ts-ignore
    return fnOrObj[FN_KEY] || '';
  }
  if (isObj(fnOrObj)) {
    // @ts-ignore
    return fnOrObj.__proto__[FN_KEY] || '';
  }
  return '';
}

export function buildFnCtx(specificProps?: Partial<IFnCtx>): IFnCtx {
  const base: IFnCtx = {
    fnKey: '', // 在 mapFn 阶段会生成
    fn: noop,
    isFirstLevel: true,
    isExpired: false,
    sourceFn: noop,
    isComputing: false,
    forAtom: false,
    remainRunCount: 0,
    showProcess: false,
    readDep: false,
    nextLevelFnKeys: [],
    prevLevelFnKeys: [],
    mountStatus: NOT_MOUNT,
    depKeys: [],
    depSharedKeys: [],
    result: {},
    fnType: 'watch',
    isReaded: false,
    isReadedOnce: false,
    returnUpstreamResult: false,
    scopeType: 'static',
    renderStatus: RENDER_START,
    proxyResult: {},
    updater: noop,
    createTime: Date.now(),
    shouldReplaceResult: false,
    isAsync: false,
    isAsyncTransfer: false,
    asyncType: MAY_TRANSFER,
    subscribe: (cb) => {
      cb();
    },
    renderInfo: {
      sn: 0,
      getDeps: () => base.depKeys.slice(),
    },
  };
  return Object.assign(base, specificProps || {});
}

export function mapFn(
  fn: Fn,
  options: { specificProps: Partial<IFnCtx> & { scopeType: ScopeType }; fnCtxBase?: IFnCtx; sharedState?: Dict },
) {
  const { specificProps, fnCtxBase, sharedState } = options;
  injectHeluxProto(fn);
  const { scopeType } = specificProps;
  const fnKey = markFnKey(fn, scopeType);
  const props = { fn, fnKey, ...specificProps };
  scope.runningFnKey = fnKey;
  scope.runningSharedState = sharedState;
  let fnCtx = buildFnCtx(props);
  if (fnCtxBase) {
    // 指向用户透传的 fnCtxBase
    fnCtx = Object.assign(fnCtxBase, props);
  }
  getCtxMap(scopeType).set(fnKey, fnCtx);
  return fnCtx;
}

export function delFn(fn: Fn) {
  const fnKey = getFnKey(fn);
  if (!fnKey) return;

  const fnCtx = getFnCtx(fnKey);
  fnCtx && delFnCtx(fnCtx);
}

/**
 * 删除已记录的相关依赖数据
 */
export function delFnDepData(fnCtx: IFnCtx) {
  const { depKeys, fnKey } = fnCtx;
  depKeys.forEach((key) => {
    const fnKeys = DEPKEY_FNKEYS_MAP.get(key) || [];
    const idx = fnKeys.indexOf(fnKey);
    if (idx >= 0) {
      fnKeys.splice(idx, 1);
    }
  });
}

export function delHistoryUnmoutFnCtx() {
  const { FNKEY_HOOK_CTX_MAP } = scope;
  // works for strict mode
  if (FNKEY_HOOK_CTX_MAP.size >= SIZE_LIMIT) {
    const now = Date.now();
    FNKEY_HOOK_CTX_MAP.forEach((fnCtx) => {
      const { mountStatus, createTime, fnKey } = fnCtx;
      if ([NOT_MOUNT, UNMOUNT].includes(mountStatus) && now - createTime > EXPIRE_MS) {
        delFnDepData(fnCtx);
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        // deleting item in map.forEach is doable
        FNKEY_HOOK_CTX_MAP.delete(fnKey);
      }
    });
  }
}

export function delFnCtx(fnCtx: IFnCtx) {
  const { fnKey } = fnCtx;
  delFnDepData(fnCtx);
  FNKEY_HOOK_CTX_MAP.delete(fnKey);

  if (UNMOUNT_INFO_MAP.get(fnKey)?.c === 2) {
    UNMOUNT_INFO_MAP.delete(fnKey);
  }
  delHistoryUnmoutFnCtx();
}

export function getCtxMap(scopeKeyOrFnKey: string) {
  const map = scopeKeyOrFnKey[0] === 's' ? FNKEY_STATIC_CTX_MAP : FNKEY_HOOK_CTX_MAP;
  return map;
}

export function getFnCtx(fnKey: string) {
  const map = getCtxMap(fnKey);
  return map.get(fnKey);
}

export function getFnCtxByObj(obj: Dict) {
  const fnKey = getFnKey(obj);
  return getFnCtx(fnKey) || null;
}

export function delRunninFnKey() {
  scope.runningFnKey = '';
  scope.runningSharedState = null;
}

export function getRunninFnCtx() {
  if (!scope.runningFnKey) {
    return null;
  }
  return getFnCtx(scope.runningFnKey);
}

/**
 * 自动记录当前正在运行的函数对 depKey 的依赖
 * 以及 depKey 对应的函数记录
 */
export function recordFnDepKey(
  depKey: string | string[],
  options: { sharedKey?: number; specificCtx?: IFnCtx | null; belongCtx?: IFnCtx, sharedState?: any },
) {
  const runningFnCtx = getRunninFnCtx();
  const fnCtx: IFnCtx | null | undefined = options.specificCtx || runningFnCtx;
  if (!fnCtx) {
    return;
  }
  const { belongCtx, sharedKey, sharedState } = options;
  if (sharedState === scope.runningSharedState) {
    // 因 mutate 里需要为自己重新赋值
     // 避免自己的 mutate 函数为自己收集，照成死循环
    return;
  }

  if (sharedKey) {
    nodupPush(fnCtx.depSharedKeys, sharedKey);
  }

  if (runningFnCtx && belongCtx) {
    runningFnCtx.isFirstLevel = false;
    if (belongCtx.isAsync) {
      runningFnCtx.isAsync = true;
    }
    const fnKey = belongCtx.fnKey;
    nodupPush(fnCtx.prevLevelFnKeys, fnKey);
    nodupPush(belongCtx.nextLevelFnKeys, runningFnCtx.fnKey);
  }

  const doRecord = (depKey: string) => {
    if (PROTO_KEY === depKey) {
      return;
    }
    nodupPush(fnCtx.depKeys, depKey);
    const fnKeys = safeMapGet(DEPKEY_FNKEYS_MAP, depKey, []);
    nodupPush(fnKeys, fnCtx.fnKey);
  };

  if (Array.isArray(depKey)) {
    depKey.forEach(doRecord);
  } else {
    doRecord(depKey);
  }
}

export function ensureFnDepData(fnCtx?: IFnCtx) {
  if (fnCtx) {
    fnCtx.depKeys.forEach((depKey: string) => recordFnDepKey(depKey, { specificCtx: fnCtx }));
  }
}

export function getDepFnStats(depKey: string, runCountStats: Dict<number>) {
  const fnKeys = DEPKEY_FNKEYS_MAP.get(depKey) || [];
  const firstLevelFnKeys: string[] = [];
  const asyncFnKeys: string[] = [];

  fnKeys.forEach((fnKey) => {
    const fnCtx = getFnCtx(fnKey);
    if (!fnCtx) return;
    if (fnCtx.isFirstLevel) {
      firstLevelFnKeys.push(fnKey);
    }
    if (fnCtx.isAsync) {
      asyncFnKeys.push(fnKey);
    }
    const count = runCountStats[fnKey]; // 每个函数将要运行的次数统计
    runCountStats[fnKey] = count === undefined ? 1 : count + 1;
  });

  return { firstLevelFnKeys, asyncFnKeys };
}

/**
 * 标记函数正在计算过程中，用户需自己消费 useDerived 返回的 isComputing 值控制 ui 渲染
 */
export function markComputing(fnKey: string, runCount: number) {
  const fnCtx = getFnCtx(fnKey);
  if (!fnCtx) return;
  if (fnCtx.showProcess) {
    fnCtx.isComputing = true;
    fnCtx.updater();
  }
  if (runCount) {
    fnCtx.remainRunCount += runCount;
  }
}

/**
 * 执行 derive 设置的导出函数
 */
export function runFn(
  fnKey: string,
  options?: { sn?: number; force?: boolean; isFirstCall?: boolean; updateReasons?: TriggerReason[] },
) {
  const { isFirstCall = false, updateReasons = [], sn = 0 } = options || {};
  const fnCtx = getFnCtx(fnKey);
  if (!fnCtx) {
    return;
  }
  if (fnCtx.remainRunCount > 0) {
    fnCtx.remainRunCount -= 1;
  }

  const { isAsync, fn, sourceFn, isAsyncTransfer, fnType, forAtom, result } = fnCtx;
  const assignResult = (data: Dict) => {
    const dataVar = forAtom ? { val: data } : data;
    // 是计算函数
    if (fnType === DERIVE) {
      // 非中转结果
      if (!fnCtx.returnUpstreamResult && dataVar) {
        Object.assign(fnCtx.result, dataVar);
      }
      // 需生成新的代理对象，让直接透传结果给 memo 组件的场景也能够正常工作，useDerived 会用到此属性
      fnCtx.shouldReplaceResult = true;
    }
  };
  /** 尝试更新函数对应的实例 */
  const triggerUpdate = () => {
    let canUpdate = false;
    // 开启读依赖功能时，实例读取了计算结果才执行更新
    if (fnCtx.readDep) {
      fnCtx.isReaded && (canUpdate = true);
    } else if (fnCtx.isReadedOnce) {
      // 未开启读依赖功能时，实例曾读取过计算结果就执行更新
      canUpdate = true;
    }
    if (canUpdate) {
      fnCtx.renderInfo.sn = sn;
      fnCtx.updater();
    }
  };
  /** 下钻执行其他函数 */
  const updateAndDrillDown = (data?: any) => {
    assignResult(data);
    if (isFirstCall) {
      if (isAsync && !computeMod.shouldShowComputing(fnCtx.depKeys) && fnCtx.isComputing) {
        fnCtx.isComputing = false;
      }
    } else if (fnCtx.remainRunCount === 0) {
      fnCtx.isComputing = false;
    }
    triggerUpdate();
    fnCtx.nextLevelFnKeys.forEach((key) => {
      runFn(key, { isFirstCall, sn, updateReasons })
    });
  };

  const prevResult = forAtom ? result.val : result;
  const fnParams = { isFirstCall, prevResult, updateReasons };
  if (!isAsync) {
    const result = fn(fnParams);
    return updateAndDrillDown(result);
  }

  // mark computing for first run
  if (isFirstCall && isAsync) {
    fnCtx.nextLevelFnKeys.forEach((key) => markComputing(key, 0));
  }

  if (isAsyncTransfer) { // only works for useDerived
    updateAndDrillDown();
    return fnCtx.result;
  }
  if (fnCtx.asyncType === MAY_TRANSFER) {
    const result = fn(fnParams);
    return updateAndDrillDown(result);
  }

  if (isFirstCall) {
    fnCtx.depKeys.forEach(depKey => computeMod.putRunningFnKey(depKey, fnKey));
  }
  // TODO: allow user configure global err handler for async compupted
  if (fnCtx.asyncType === SOURCE) {
    return fn({ ...fnParams, source: sourceFn(fnParams).source }).then((data: any) => {
      fnCtx.depKeys.forEach(depKey => computeMod.delRunningFnKey(depKey, fnKey));
      updateAndDrillDown(data);
      return data;
    });
  }

  return fn(fnParams)
    .task(fnParams)
    .then((data: any) => {
      updateAndDrillDown(data);
      return data;
    });
}

/**
 * run redive fn by result
 */
export function rerunDeriveFn<T extends Dict = Dict>(result: T): T {
  const fnCtx = getFnCtxByObj(result);
  if (!fnCtx) {
    throw new Error('[Helux]: not a derived result');
  }
  return runFn(fnCtx.fnKey);
}

export function runDerive<T extends Dict = Dict>(result: T): T {
  return rerunDeriveFn(result);
}

export function runDeriveAsync<T extends Dict = Dict>(result: T): Promise<T> {
  return Promise.resolve(rerunDeriveFn(result));
}

export function recoverDep(fnCtx: IFnCtx) {
  const { fnKey } = fnCtx;
  FNKEY_HOOK_CTX_MAP.set(fnKey, fnCtx);

  let info = UNMOUNT_INFO_MAP.get(fnKey);
  if (info) {
    info.c = 2;
  } else {
    info = { c: 1, t: Date.now(), prev: 0 };
    UNMOUNT_INFO_MAP.set(fnKey, info);
  }

  const { c: mountCount } = info;
  if (mountCount === 2) {
    // 因为双调用导致第二次 mount，需把前一刻已触发了 unmount 行为导致的依赖丢失还原回来
    const fnCtx = getFnCtx(fnKey);
    ensureFnDepData(fnCtx);
  }
}

export function getDepSharedStateFeature(fn: IFnCtx) {
  let feature = '';
  fn.depSharedKeys.forEach((key) => {
    const ver = getInternalByKey(key)?.ver || 0;
    feature += `${ver}_`;
  });
  return feature;
}

/**
 * see window.__HELUX__.help.fnDep.FNKEY_HOOK_CTX_MAP
 */
export function markExpired() {
  if (isDebug()) {
    // for hot reload working well
    FNKEY_HOOK_CTX_MAP.forEach((item) => {
      item.isExpired = true;
    });
  }
}
