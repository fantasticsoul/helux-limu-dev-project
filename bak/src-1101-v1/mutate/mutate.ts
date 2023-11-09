import type { SharedState, IDefMutateRuleOptions, IMutateRule } from '../types';
import { getInternal } from '../helpers/state';
import { callWatcherMutate, runMutateRules } from '../factory/creator/mutateRule';
import { tryAlert, noop } from '../utils';

function check(sharedState: SharedState, label: string) {
  const internal = getInternal(sharedState);
  if (!internal) {
    return tryAlert(`[[${label}]] err: not a valid shared sate`);
  }
}

export function commitMutateDesc(sharedState: SharedState, desc: string) {
  check(sharedState, 'commitMutateDesc');
  callWatcherMutate(sharedState, desc);
}

export function defineMutateRules<T extends SharedState = SharedState>(options: IDefMutateRuleOptions<T>) {
  runMutateRules({ ...options, forChange: false });
}

/**
 * 巧妙利用运行同步的 mutate 函数命中不同的 desc 对应逻辑可以完成各项监听的操作，
 * 来实现自动化的将监听状态的改变行为自动对应到目标状态的 mutate 里不同的逻辑
 */
export function runMutateDescs(targetSharedState: SharedState, descs: string[]) {
  const rules: IMutateRule[] = descs.map(desc => ({ when: noop, desc }));
  defineMutateRules({ target: targetSharedState, rules });
}
