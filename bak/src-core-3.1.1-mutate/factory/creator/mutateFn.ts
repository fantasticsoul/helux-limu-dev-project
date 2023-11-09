import { SCOPE_TYPE } from '../../consts';
import { getInternal } from '../../helpers/state';
import type {
  Fn,
  IMutateFnParamsBase,
  ICallMutateFnOptions,
  IInnerSetStateOptions,
  IRunMutateFnOptions,
  SharedState,
} from '../../types';
import { noop, isFn, isObj, enureReturnArr } from '../../utils';
import { setLaadStatus } from '../../factory/creator/loading';
import { createWatchLogic } from '../createWatch';

interface ICallMutateFnLogicOptionsBase {
  isOut?: boolean;
  desc?: string;
  sn?: number;
  skipBefore?: boolean;
}

interface ICallMutateFnLogicOptions<T = SharedState> extends ICallMutateFnLogicOptionsBase {
  draft?: T;
  fn: Fn;
  /** fn 函数调用入参拼装 */
  getFnArgs?: (param: { draft: SharedState, setState: Fn, desc: string }) => any[];
}

interface ICallAsyncMutateFnLogicOptions extends ICallMutateFnLogicOptionsBase {
  deps?: Fn;
  task: Fn;
  /** task 函数调用入参拼装，暂不像同步函数逻辑那样提供 draft 给用户直接操作，用户必须使用 setState 修改状态 */
  getTaskArgs?: (param: { desc: string, setState: Fn }) => any[];
}

function mayWrapVal(forAtom: boolean, val: any) {
  if (val === undefined) return; // undefined 丢弃，如正需要赋值 undefined，对 draft 操作即可
  if (forAtom) return { val };
  if (isObj(val)) return val;
};

function getCommonParam(options: ICallMutateFnLogicOptionsBase) {
  const { isOut = true, desc, sn } = options;
  const from: IMutateFnParamsBase['from'] = isOut ? 'outMutate' : 'innerMutate';
  const customOptions: IInnerSetStateOptions = { desc, sn };
  return { from, customOptions };
}

/** 呼叫异步函数的逻辑封装 */
export function callAsyncMutateFnLogic<T = SharedState>(targetState: T, options: ICallAsyncMutateFnLogicOptions) {
  const { desc = '', sn, task, skipBefore = false, getTaskArgs = noop, deps } = options;
  const internal = getInternal(targetState);
  const { before, setStateImpl, forAtom } = internal;
  const { from, customOptions } = getCommonParam(options);

  const setState: any = (cb: any) => {
    const { draft, finishMutate } = setStateImpl(noop);
    // 注意这里需要区分是 atom 还是 shared 返回，atom 返回要自动包裹未 { val: T }
    const mayPartial = (!isFn(cb) ? mayWrapVal(forAtom, cb) : mayWrapVal(forAtom, cb(draft)));
    let mayAnotherPartial = null;
    if (!skipBefore) {
      mayAnotherPartial = mayWrapVal(forAtom, before({ from, draft, desc, sn }));
    }
    let mergedPartial;
    if (mayPartial || mayAnotherPartial) {
      mergedPartial = Object.assign({}, mayPartial, mayAnotherPartial);
    }
    finishMutate(mergedPartial, customOptions);
  };

  const defaultParams = { desc, setState, input: enureReturnArr(deps) };
  const args = getTaskArgs(defaultParams) || [defaultParams];

  setLaadStatus(internal, desc, { loading: true, err: null, ok: false });
  return Promise.resolve(task(...args)).then(() => {
    setLaadStatus(internal, desc, { loading: false, err: null, ok: true });
  }).catch((err) => {
    setLaadStatus(internal, desc, { loading: false, err, ok: false });
  }).finally(() => {
    return internal.rawStateSnap;
  });
}

/** 呼叫同步函数的逻辑封装 */
export function callMutateFnLogic<T = SharedState>(targetState: T, options: ICallMutateFnLogicOptions<T>) {
  const { desc = '', sn, fn, skipBefore = false, getFnArgs = noop } = options;
  const { before, setStateImpl, setDraft } = getInternal(targetState);
  const { from, customOptions } = getCommonParam(options);

  let draft = options.draft as SharedState; // 如果传递了 draft 表示需要复用
  let finishMutate = noop;
  if (!draft) { // 不透传 draft 时，才指向一个真正有结束功能的 finishMutate 句柄
    const ret = setStateImpl(noop);
    draft = ret.draft;
    finishMutate = ret.finishMutate;
  }
  // 不定制同步函数入参的话，默认就是 draft，调用函数形如：(draft)=>draft.xxx+=1;
  const args = getFnArgs({ draft, setState: setDraft, desc }) || [draft];

  fn(...args);
  let newPartial;
  if (!skipBefore) {
    newPartial = before({ from, draft, desc, sn });
  }
  return finishMutate(newPartial, customOptions);
}

/** 调用 mutate 函数，优先处理 task，且最多只处理一个，调用方自己保证只传一个 */
export function callMutateFn<T = SharedState>(targetState: T, options: ICallMutateFnOptions<T> = {}) {
  const { isOut, desc = '', sn = 0, fn, task, deps, draft } = options;
  if (task) { // 处理异步函数
    callAsyncMutateFnLogic(targetState, { isOut, desc, sn, task, deps });
    return;
  }
  if (fn) { // 处理同步函数
    callMutateFnLogic(targetState, { isOut, desc, sn, fn, draft });
  }
}

export function configMutateFns(options: IRunMutateFnOptions) {
  const { target, fns, isOut } = options;
  let { setStateImpl, outMutateFnDict } = getInternal(target);
  let { draft, finishMutate } = setStateImpl(noop);
  let lastIdx = fns.length - 1;

  fns.forEach((item, idx) => {
    if (isOut) { // 记录外部定义的 mutate
      outMutateFnDict[item.desc || ''] = item;
    }
    createWatchLogic(
      ({ sn, isFirstCall }) => {
        const { desc = '', fn, task, deps, immediate = false } = item;

        // fn 只会被调用一次，首次运行会复用 draft ，经过多次修改，最后一次才提交
        if (fn && isFirstCall) {
          callMutateFn(target, { draft, sn, isOut, fn, desc, deps });
        }
        if (task) {
          // 第一次运行则检查 immediate
          if ((isFirstCall && immediate) || !isFirstCall) {
            callMutateFn(target, { sn, isOut, task, desc, deps });
          }
        }

        // 循环到最后时将收集所有函数对上游数据的依赖，然后刻意将 draft 置空，后续此段逻辑不会再触发
        if (lastIdx === idx && draft) {
          finishMutate(null, { desc: desc || 'RunMutateFns' });
          draft = null;
        }
      },
      {
        deps: item.deps || noop,
        sharedState: target,
        scopeType: SCOPE_TYPE.STATIC,
        immediate: true,
      },
    );
  });
}
