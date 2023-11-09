import { SCOPE_TYPE } from '../../consts';
import { getInternal } from '../../helpers/state';
import type {
  ICallWatcherMutateOptions,
  IInnerSetStateOptions,
  IMutateRule,
  IMutateFnParams,
  IRunMutateRulesOptions,
  ISetStateOptions,
  SharedState,
  ParsedChangeFn,
} from '../../types';
import { noop } from '../../utils';
import { createWatchLogic } from '../createWatch';

export function callWatcherMutate<T = SharedState>(watcherState: T, options: ICallWatcherMutateOptions<T> = {}) {
  const { prevDesc, forChange, desc = '', sn, fn } = options;
  const { mutate, watch, setStateImpl, changeFn } = getInternal(watcherState);
  let draft = options.draft; // 如果传递了 draft 表示需要复用
  let finishMutate = noop;
  const from = forChange ? 'change' : 'setState';

  if (!draft) { // 不透传 draft 时，才指向一个真正有结束功能的 finishMutate 句柄
    const ret = setStateImpl(noop);
    draft = ret.draft;
    finishMutate = ret.finishMutate;
  }

  const customOptions: IInnerSetStateOptions = { desc, sn };
  // 支持用户追加 desc 透传给 下一个 watcher 的 mutate 函数，可从 prevDesc 获取到
  const setOptions = (options: ISetStateOptions) => {
    const { desc = null, ...rest } = options;
    Object.assign(customOptions, { ...rest, prevDesc: desc });
  };
  const params: IMutateFnParams = { from, draft, watch, desc, prevDesc, setOptions, sn };

  if (fn) {
    fn(draft);
  } else {
    changeFn.dict[desc]?.(draft);
  }
  const newPartial = mutate(params);
  finishMutate(newPartial, customOptions);

  // TODO support dangerous asyncMutate
  // TODO, pass uncaught err to global err handler
  // Promise.resolve(mutateFn(params)).then((newPartial) => {
  //   finishMutate(newPartial, customOptions);
  // });
}

export function runMutateRules<T = SharedState>(options: IRunMutateRulesOptions<T>) {
  const { target, rules, forChange } = options;
  let { draft, finishMutate } = getInternal(target).setStateImpl(noop);
  let lastIdx = rules.length - 1;

  rules.forEach((rule, idx) => {
    createWatchLogic<T>(
      ({ sn }) => {
        const { desc, change } = rule;
        // 首次运行会复用 draft ，经过多次修改，最后一次才提交
        if (desc) {
          callWatcherMutate(target, { draft, sn, forChange, desc });
        }
        if (change) {
          callWatcherMutate(target, { draft, sn, forChange, fn: change });
        }
        // 循环到最后时将收集所有函数对上游数据的依赖，然后刻意将 draft 置空，后续此段逻辑不会再触发
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

export function configChangeFns<T = SharedState>(sharedState: T, changeFn: ParsedChangeFn<T>) {
  const rules: IMutateRule<T>[] = [];
  const { list, dict } = changeFn;
  // 此处故意设置了无意义的 when，收集将在 changeFn 执行时完成，注意此处只需要配置 desc 即可
  list.forEach(change => rules.push({ when: noop, change }));
  Object.keys(dict).forEach((desc) => rules.push({ when: noop, desc }));
  runMutateRules<T>({ target: sharedState, rules, forChange: true });
}
