import { ASYNC_TYPE } from '../../consts';
import { createDerivedLogic } from '../../factory/createDerived';
import { createDerivedAsyncLogic } from '../../factory/createDerivedAsync';
import { createDerivedTaskLogic } from '../../factory/createDerivedTask';
import { getFnCtxByObj, delFnCtx } from '../../helpers/fndep';
import { attachInsDerivedResult } from '../../helpers/ins';
import { isFn, isObj, isPromise, isAsyncFn } from '../../utils';
import type { AsyncType, IFnCtx, ScopeType } from '../../types';

const InvalidInput = 'ERR_NON_DERIVED_FN_OR_RESULT: useDerived only accept a static derived result or derived fn';

export interface IUseDerivedOptions {
  fn: any;
  sourceFn?: any;
  asyncType?: AsyncType;
  careDeriveStatus?: boolean;
  enableRecordResultDep?: boolean;
}

interface IInitOptions extends IUseDerivedOptions {
  deriveCtx: { input: any, deriveFn: any };
  fnCtx: IFnCtx;
}

/**
 * with hot-reload mode, static result ref may be changed
 */
function isInputChanged(fnCtx: IFnCtx, storedInput: any, curInput: any) {
  if (fnCtx.isExpred) {
    fnCtx.isExpred = false;
    return true;
  }

  if (isFn(curInput)) {
    if (isPromise(curInput) || isAsyncFn(curInput)) return false;
    const isDebug = !!window.location.port;
    return isDebug;
  }
  return curInput !== storedInput;
}

export function initDerivedResult(options: IInitOptions) {
  const { deriveCtx, fn, sourceFn, fnCtx, careDeriveStatus, asyncType } = options;
  let isAsync = false;
  let upstreamFnCtx: IFnCtx | null = null;
  const scopeType: ScopeType = 'hook';

  // 已记录函数句柄，完成了导出结果的各种初始动作
  if (deriveCtx.deriveFn) {
    const isChanged = isInputChanged(fnCtx, deriveCtx.input, fn);
    if (!isChanged) {
      return;
    } else {
      console.error('call delFnCtx in initDerivedResult');
      delFnCtx(fnCtx); // del prev mapping fnCtx data
    }
  }

  deriveCtx.input = fn;
  // 传入了局部的临时计算函数
  if (asyncType === ASYNC_TYPE.NORMAL) {
    if (isFn(fn)) {
      deriveCtx.deriveFn = fn;
    } else if (isObj(fn)) {
      // may a static derived result
      upstreamFnCtx = getFnCtxByObj(fn);
      if (!upstreamFnCtx) {
        throw new Error(InvalidInput);
      }
      const ensuredFnCtx = upstreamFnCtx;
      isAsync = upstreamFnCtx.isAsync;
      // 做结果中转
      deriveCtx.deriveFn = () => ensuredFnCtx.result;
    } else {
      throw new Error(InvalidInput);
    }

    if (isAsync && upstreamFnCtx) {
      const ensuredFnCtx = upstreamFnCtx;
      createDerivedAsyncLogic(
        () => ({ source: ensuredFnCtx.result, initial: ensuredFnCtx.result }),
        async () => ensuredFnCtx.result,
        {
          scopeType,
          fnCtxBase: fnCtx,
          allowTransfer: true,
          runAsync: false,
          returnUpstreamResult: true,
          careDeriveStatus,
        },
      );
    } else {
      createDerivedLogic(deriveCtx.deriveFn, { scopeType, fnCtxBase: fnCtx });
    }
  } else {
    // source or task
    deriveCtx.deriveFn = fn;
    if (asyncType === ASYNC_TYPE.SOURCE) {
      createDerivedAsyncLogic(sourceFn, fn, { scopeType, fnCtxBase: fnCtx, careDeriveStatus });
    } else {
      createDerivedTaskLogic(fn, { scopeType, fnCtxBase: fnCtx, careDeriveStatus });
    }
  }

  attachInsDerivedResult(fnCtx);
}