import type {
  ChangeFns, SharedState, IRunMutateRulesOptions, ICallWatcherMutateOptions,
  IInnerSetStateOptions, ISetStateOptions, IMutateRule,
} from '../../types';
import { SCOPE_TYPE } from '../../consts';
import { getInternal } from '../../helpers/state';
import { createWatchLogic } from '../createWatch';
import { noop } from '../../utils';

export function callWatcherMutate(watcherState: SharedState, desc: any, options: ICallWatcherMutateOptions = {}) {
  const { prevDesc, forChange } = options;
  const { mutate, mutateWrap, watch, setStateImpl } = getInternal(watcherState);
  let draft = options.draft; // 如果传递了 draft 表示需要复用
  let finishMutate = noop;
  const mutateFn = forChange ? mutateWrap : mutate;

  if (!draft) {
    const ret = setStateImpl(noop);
    draft = ret.draft;
    finishMutate = ret.finishMutate;
  }
  const customOptions: IInnerSetStateOptions = { desc };
  // 支持用户追加 desc 透传给 下一个 watcher 的 mutate 函数，可从 prevDesc 获取到
  const setOptions = (options: ISetStateOptions) => {
    const { desc = null, ...rest } = options;
    Object.assign(customOptions, { ...rest, prevDesc: desc });
  };
  const params = { draft, watch, desc, prevDesc, setOptions };
  const newPartial = mutateFn(params);
  finishMutate(newPartial, customOptions);

  // TODO support asyncMutate
  // TODO, pass uncaught err to global err handler
  // Promise.resolve(mutateFn(params)).then((newPartial) => {
  //   finishMutate(newPartial, customOptions);
  // });
}

export function runMutateRules<T = SharedState>(options: IRunMutateRulesOptions<T>) {
  const { target, rules } = options;
  let { draft, finishMutate } = getInternal(target).setStateImpl(noop);
  let lastIdx = rules.length - 1;

  rules.forEach((rule, idx) => {
    createWatchLogic(
      () => {
        const { desc, change } = rule;
        if (desc) {
          // 首次运行时，会复用draft，经过多次修改，最后一次才提交
          callWatcherMutate(target, desc, { draft })
        }
        if (change) {
          getInternal(target).setState(change);
        }

        // 执行一次收集到依赖后 draft 置空，后续此段逻辑不会再触发
        if (lastIdx === idx && draft) {
          finishMutate(null, { desc });
          draft = null;
        }
      },
      {
        dep: () => rule.when(),
        sharedState: target,
        scopeType: SCOPE_TYPE.STATIC,
        immediate: true,
      },
    );
  });
}

export function configChangeFns<T = SharedState>(sharedState: SharedState, chanegFns: ChangeFns<T>) {
  // 此处故意设置了无意义的when，收集是在 changeFn 执行时完成
  const rules: IMutateRule[] = Object.keys(chanegFns).map(desc => ({ when: noop, desc, change: chanegFns[desc] }));
  runMutateRules({ target: sharedState, rules, forChange: true });
}
