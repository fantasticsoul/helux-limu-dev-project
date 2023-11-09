import { ASYNC_TYPE, WATCH } from '../consts';
import { delComputingFnKey, getFnCtx, getFnCtxByObj, putComputingFnKey, shouldShowComputing } from '../factory/common/fnScope';
import type { Dict, TriggerReason } from '../types';
import { markComputing } from './fnStatus';

const { MAY_TRANSFER, SOURCE } = ASYNC_TYPE;

/**
 * 执行 derive 设置的导出函数
 */
export function runFn(fnKey: string, options?: { sn?: number; force?: boolean; isFirstCall?: boolean; triggerReasons?: TriggerReason[] }) {
  const { isFirstCall = false, triggerReasons = [], sn = 0 } = options || {};
  const fnCtx = getFnCtx(fnKey);
  if (!fnCtx) {
    return;
  }
  if (fnCtx.fnType === WATCH) {
    return fnCtx.fn({ isFirstCall, triggerReasons });
  }

  const { isAsync, fn, sourceFn, isAsyncTransfer, forAtom, result } = fnCtx;
  if (fnCtx.remainRunCount > 0) {
    fnCtx.remainRunCount -= 1;
  }

  const assignResult = (data: Dict) => {
    const dataVar = forAtom ? { val: data } : data;
    // 非中转结果
    if (!fnCtx.returnUpstreamResult && dataVar) {
      Object.assign(fnCtx.result, dataVar);
    }
    // 需生成新的代理对象，让直接透传结果给 memo 组件的场景也能够正常工作，useDerived 会用到此属性
    fnCtx.shouldReplaceResult = true;
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
      if (isAsync && !shouldShowComputing(fnCtx.depKeys) && fnCtx.isComputing) {
        fnCtx.isComputing = false;
      }
    } else if (fnCtx.remainRunCount === 0) {
      fnCtx.isComputing = false;
    }
    triggerUpdate();
    fnCtx.nextLevelFnKeys.forEach((key) => {
      runFn(key, { isFirstCall, sn, triggerReasons });
    });
  };

  const prevResult = forAtom ? result.val : result;
  const fnParams = { isFirstCall, prevResult, triggerReasons };
  if (!isAsync) {
    const result = fn(fnParams);
    return updateAndDrillDown(result);
  }

  // mark computing for first run
  if (isFirstCall && isAsync) {
    fnCtx.nextLevelFnKeys.forEach((key) => markComputing(key, 0));
  }

  if (isAsyncTransfer) {
    // only works for useDerived
    updateAndDrillDown();
    return fnCtx.result;
  }
  if (fnCtx.asyncType === MAY_TRANSFER) {
    const result = fn(fnParams);
    return updateAndDrillDown(result);
  }

  if (isFirstCall) {
    fnCtx.depKeys.forEach((depKey) => putComputingFnKey(depKey, fnKey));
  }
  // TODO: allow user configure global err handler for async compupted
  if (fnCtx.asyncType === SOURCE) {
    return fn({ ...fnParams, source: sourceFn(fnParams).source }).then((data: any) => {
      fnCtx.depKeys.forEach((depKey) => delComputingFnKey(depKey, fnKey));
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
