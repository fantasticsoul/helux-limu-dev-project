import { callMutateFn, runMutateFns } from '../factory/creator/mutateFn';
import { checkShared } from '../factory/common/check';
import { getInternal } from '../helpers/state';
import type { IDefMutateFnOptions, SharedState } from '../types';
import { SINGLE_MUTATE } from '../consts';

function runMutateFnItem(sharedState: SharedState, inputDesc?: string, forTask?: boolean) {
  checkShared(sharedState, false, 'runMutateFn');
  const { mutateFns } = getInternal(sharedState);
  const desc = inputDesc || SINGLE_MUTATE; // 未传递任何描述，尝试调用可能存在的单函数

  // 调用 desc 对应的函数
  const item = mutateFns.find(item => item.desc === desc);
  if (!item) return;
  const { fn, task } = item;

  if (forTask && task) {
    callMutateFn(sharedState, { sn: 0, isOut: true, task, desc });
    return;
  }
  if (fn) {
    callMutateFn(sharedState, { sn: 0, isOut: true, fn, desc });
  }
}

export function runMutateFn(sharedState: SharedState, desc?: string) {
  checkShared(sharedState, false, 'runMutateFn');
  runMutateFnItem(sharedState, desc);
}

export function runMutateFnTask(sharedState: SharedState, desc?: string) {
  checkShared(sharedState, false, 'runMutateFnTask');
  runMutateFnItem(sharedState, desc, true);
}

export function defineMutateFns<T = SharedState>(options: IDefMutateFnOptions<T>) {
  runMutateFns({ ...options, isOut: false });
}
