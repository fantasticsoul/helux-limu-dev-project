import type { SharedState, IDefMutateRuleOptions, IMutateRule } from '../types';
import { SCOPE_TYPE } from '../consts';
import { getInternal } from '../helpers/state';
import { callWatcherMutate } from '../factory/common/mutateRule';
import { createWatchLogic } from '../factory/createWatch';
import { tryAlert, noop } from '../utils';

const inner = {
  check(sharedState: SharedState, label: string) {
    const internal = getInternal(sharedState);
    if (!internal) {
      return tryAlert(`[[${label}]] err: not a valid shared sate`);
    }
  },
  commitDescLogic(sharedState: SharedState, desc: string, draft: any) {
    callWatcherMutate(sharedState, desc, { draft });
  }
}

export function commitMutateDesc(sharedState: SharedState, desc: string) {
  inner.check(sharedState, 'commitMutateDesc');
  callWatcherMutate(sharedState, desc);
}

export function defineMutateRules<T extends SharedState = SharedState>(options: IDefMutateRuleOptions<T>) {
  const { target, rules } = options;
  inner.check(target, 'defineMutateRules');

  let { draft, finishMutate } = getInternal(target).setStateImpl(noop);
  let lastIdx = rules.length - 1;

  rules.forEach((rule, idx) => {
    createWatchLogic(
      () => {
        const { desc, change } = rule;
        if (desc) {
          // 首次运行时，会复用draft，经过多次修改，最后一次才提交
          inner.commitDescLogic(target, desc, draft);
        }
        if (change) {
          getInternal(target).setState(change);
        }

        // 执行一次收集到依赖后 draft 置空，后续此段逻辑不会再触发
        if (lastIdx === idx && draft) {
          finishMutate(null, { desc });
          draft = null; 
          finishMutate = noop;
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

/**
 * 巧妙利用运行同步的 mutate 函数命中不同的 desc 对应逻辑可以完成各项监听的操作，
 * 来实现自动化的将原状态的改变行为将自动对应到目标状态的 mutate 里不同的逻辑
 */
export function runMutateDescs(targetSharedState: SharedState, descs: string[]) {
  const rules: IMutateRule[] = descs.map(desc => ({ when: noop, desc }));
  defineMutateRules({ target: targetSharedState, rules });
}
