import { ASYNC_TYPE, SCOPE_TYPE } from '../../consts';
import { isDerivedAtom } from '../../factory/common/scope';
import { createDerivedAsyncLogic, createDerivedLogic, createDerivedTaskLogic } from '../../factory/createDerived';
import { delFnCtx, getFnCtxByObj } from '../../helpers/fndep';
import { attachInsDerivedResult } from '../../helpers/ins';
import type { AsyncType, IFnCtx, ScopeType } from '../../types';
import { isFn, isObj } from '../../utils';

const InvalidInput = 'ERR_NON_DERIVED_FN_OR_RESULT: useDerived only accept a static derived result or derive fn';
const NotDerivedAtom = 'ERR_NOT_ATOM_RESULT: useAtom series fn only accept derived atom';

export interface IUseDerivedLogicOptions {
  fn: any;
  sourceFn?: any;
  asyncType?: AsyncType;
  showProcess?: boolean;
  readDep?: boolean;
  forAtom?: boolean;
}

interface IInitOptions extends IUseDerivedLogicOptions {
  deriveCtx: { input: any; deriveFn: any };
  fnCtx: IFnCtx;
}

/**
 * with hot-reload mode, static result ref may be changed
 */
function isInputChanged(fnCtx: IFnCtx, storedInput: any, curInput: any) {
  if (fnCtx.isExpired) {
    fnCtx.isExpired = false;
    return true;
  }

  // 探测函数变化已交给 isExpired 来控制，这里直接返回 false
  if (isFn(curInput)) {
    return false;
  }
  return curInput !== storedInput;
}

/**
 * 兼容调试模式下 hot-reload 模式
 */
function ensureHotReload(fnCtx: IFnCtx) {
  delFnCtx(fnCtx); // del prev mapping fnCtx data
  // 以下数据也需要清除，待后续的 createDerivedLogic 流程重新写入
  fnCtx.depKeys.length = 0;
  fnCtx.prevLevelFnKeys.length = 0;
  fnCtx.renderInfo.sn += 1;
}

/** 生成导出结果 */
export function genDerivedResult(options: IInitOptions) {
  const { deriveCtx, fn, sourceFn, fnCtx, showProcess, asyncType = ASYNC_TYPE.NORMAL, forAtom } = options;
  let isAsync = false;
  let upstreamFnCtx: IFnCtx | null = null;
  let needUpdate = false;
  const scopeType: ScopeType = SCOPE_TYPE.HOOK;

  // 已记录函数句柄，完成了导出结果的各种初始动作
  if (deriveCtx.deriveFn) {
    const isChanged = isInputChanged(fnCtx, deriveCtx.input, fn);
    if (!isChanged) {
      return;
    } else {
      needUpdate = true;
      ensureHotReload(fnCtx);
    }
  }

  deriveCtx.input = fn;
  if (asyncType === ASYNC_TYPE.NORMAL) {
    // 传入了局部的临时计算函数，形如： useDerived(()=>{ ... })
    if (isFn(fn)) {
      deriveCtx.deriveFn = fn;
    } else if (isObj(fn)) {
      // may a static derived result
      upstreamFnCtx = getFnCtxByObj(fn);
      if (!upstreamFnCtx) {
        throw new Error(InvalidInput);
      }
      const ensuredFnCtx = upstreamFnCtx;

      if (forAtom && !isDerivedAtom(ensuredFnCtx.proxyResult)) {
        throw new Error(NotDerivedAtom);
      }

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
          showProcess: showProcess ?? true,
          forAtom,
        },
      );
    } else {
      createDerivedLogic(deriveCtx.deriveFn, { scopeType, fnCtxBase: fnCtx, forAtom });
    }
  } else {
    // source or task
    deriveCtx.deriveFn = fn;
    if (asyncType === ASYNC_TYPE.SOURCE) {
      createDerivedAsyncLogic(sourceFn, fn, { scopeType, fnCtxBase: fnCtx, showProcess, forAtom });
    } else {
      createDerivedTaskLogic(fn, { scopeType, fnCtxBase: fnCtx, showProcess, forAtom });
    }
  }

  attachInsDerivedResult(fnCtx);

  if (needUpdate) {
    fnCtx.updater();
  }
}
