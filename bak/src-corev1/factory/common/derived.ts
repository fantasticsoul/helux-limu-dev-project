import { ASYNC_TYPE, DERIVE, IS_DERIVED_ATOM, SCOPE_TYPE } from '../../consts';
import { recordBlockDepKey } from '../../helpers/blockDep';
import { markFnEnd, markFnStart, registerFn } from '../../helpers/fnCtx';
import { ensureFnDepData, recordFnDepKey } from '../../helpers/fnDep';
import { runFn } from '../../helpers/fnRunner';
import { createOb, injectHeluxProto } from '../../helpers/obj';
import { getSharedKey } from '../../helpers/state';
import type { AsyncType, Dict, Fn, IFnCtx, ScopeType } from '../../types';
import { dedupList, isFn, isObj, isPromise, nodupPush, noop, tryAlert, warn } from '../../utils';
import { recordLastest } from './blockScope';
import { getFnCtxByObj, getFnKey, markFnKey } from './fnScope';

const { SOURCE, TASK, MAY_TRANSFER } = ASYNC_TYPE;
const { STATIC } = SCOPE_TYPE;

function checkResult(fnCtx: IFnCtx, result: Dict, forAtom?: boolean) {
  if (!forAtom) {
    if (!isObj(result) || isPromise(result)) {
      throw new Error('ERR_NON_OBJ: result must be an plain json object!');
    }
  }
  const { isAsync, isAsyncTransfer } = fnCtx;
  // 未标记是异步中转函数时，不允许异步计算函数做结果、共享状态中转
  if (isAsync && !isAsyncTransfer) {
    const fnKey = getFnKey(result);
    const sharedKey = getSharedKey(result);
    if (fnKey || sharedKey) {
      throw new Error(
        'ERR_INVALID_CALL: derive(),deriveAsync can not transfer another derived result or shared state, it will cause wrong result',
      );
    }
  }
}

export function attachStaticProxyResult(fnCtx: IFnCtx, forAtom: boolean) {
  const proxyResult = createOb(fnCtx.result, {
    set: () => {
      warn('changing derived result is invalid');
      return false;
    },
    get: (target: Dict, key: any) => {
      if (key === IS_DERIVED_ATOM) {
        return forAtom;
      }
      const val = target[key];
      // copy depKeys
      recordFnDepKey(fnCtx.depKeys, { belongCtx: fnCtx });
      // transfer depKeys for block or signal
      recordBlockDepKey(proxyResult, fnCtx.depKeys);
      recordLastest(val, proxyResult, '', [key], true, forAtom);
      return val;
    },
  });
  fnCtx.proxyResult = proxyResult;
  return proxyResult;
}

interface IInitDeriveFnOptions {
  deriveFn: Fn;
  showProcess?: boolean;
  sourceFn?: Fn;
  scopeType?: ScopeType;
  fnCtxBase?: IFnCtx;
  isAsync?: boolean;
  asyncType?: AsyncType;
  allowTransfer?: boolean;
  returnUpstreamResult?: boolean;
  runAsync?: boolean;
  forAtom?: boolean;
}

/**
 * 初始化 derive 函数，主要包含函数注册、函数运行、生成代理结果 3 个步骤
 */
export function initDeriveFn(options: IInitDeriveFnOptions) {
  const {
    sourceFn = noop,
    deriveFn,
    isAsync = false,
    scopeType = STATIC,
    fnCtxBase,
    // allowTransfer 将映射到 isAsyncTransfer，目前仅 hook 函数支持转移异步结果
    allowTransfer = false,
    asyncType = MAY_TRANSFER,
    returnUpstreamResult,
    runAsync = true,
    showProcess = false,
    forAtom = false,
  } = options;
  if (!isFn(sourceFn) || !isFn(deriveFn)) {
    throw new Error('ERR_NON_FN: only accpet function arg!');
  }
  const fnCtx = registerFn(deriveFn, {
    specificProps: { forAtom, scopeType, fnType: DERIVE, isAsync, asyncType, isAsyncTransfer: allowTransfer, showProcess },
    fnCtxBase,
  });

  let source: any = null;
  let result = {};

  markFnStart(fnCtx.fnKey);
  const fnParams = { isFirstCall: true, prevResult: null };
  if (!isAsync) {
    result = deriveFn(fnParams);
    source = result;
  } else {
    if (asyncType === SOURCE) {
      const wrap = sourceFn(fnParams);
      fnCtx.sourceFn = sourceFn;
      source = wrap.source;
      result = wrap.initial;
    } else if (asyncType === TASK) {
      const wrap = deriveFn(fnParams);
      result = wrap.initial;
    }
  }
  markFnEnd();

  const upstreamFnCtx = getFnCtxByObj(source);
  if (forAtom && !upstreamFnCtx) {
    // 非结果中转
    result = { val: result }; // wrap as atom shape
  }
  const curFnKey = fnCtx.fnKey;
  checkResult(fnCtx, result);

  // 特殊处理计算结果中转行为
  // const cu1 = derive(...);
  // const cu2 = derive(()=>cu1); // 此处产生结果中转
  if (source) {
    if (upstreamFnCtx) {
      // 关联上下游函数
      fnCtx.depKeys = dedupList(fnCtx.depKeys.concat(upstreamFnCtx.depKeys));
      // 异步函数已在 checkResult 里保证不能产生结果中转行为，此处只需要针对处于非异步函数场景时赋值为 true 即可
      fnCtx.returnUpstreamResult = returnUpstreamResult ?? !isAsync;
      nodupPush(upstreamFnCtx.nextLevelFnKeys, fnCtx.fnKey);
      nodupPush(fnCtx.prevLevelFnKeys, upstreamFnCtx.fnKey);
      fnCtx.isFirstLevel = false;
    } else if (getSharedKey(source)) {
      // 直接用某个共享状态作为输入源
      fnCtx.depKeys = Object.keys(source);
    }
    ensureFnDepData(fnCtx); // 人工补录 depKey 和 fn 的依赖关系
  }

  if (!fnCtx.returnUpstreamResult) {
    // 给 result 和 fn 标记相同的 key
    injectHeluxProto(result);
    markFnKey(result, scopeType, curFnKey);
  }

  if (runAsync && (asyncType === SOURCE || asyncType === TASK)) {
    runFn(curFnKey, { isFirstCall: true, sn: fnCtx.renderInfo.sn + 1 })
      .then((data: any) => {
        checkResult(fnCtx, data, forAtom);
      })
      .catch((err: any) => tryAlert(err));
  }

  fnCtx.result = result;

  if (fnCtx.returnUpstreamResult) {
    fnCtx.proxyResult = result; // 返回上游结果，此结果已被代理
  } else {
    attachStaticProxyResult(fnCtx, forAtom);
  }
  // if (scopeType === STATIC && !fnCtx.returnUpstreamResult) {
  //   attachStaticProxyResult(fnCtx, forAtom);
  // }

  return fnCtx;
}
