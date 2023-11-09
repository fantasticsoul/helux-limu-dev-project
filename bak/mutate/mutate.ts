import { callMutateFn, configMutateFns } from '../factory/creator/mutateFn';
import { checkShared } from '../factory/common/check';
import { genFnKey } from '../factory/common/key';
import { getInternal } from '../helpers/state';
import type { SharedState, MutateFnItem, SharedDict, Atom, AtomMutateFnItem } from '../types';
import { SINGLE_MUTATE } from '../consts';

function runMutateFnItem(sharedState: SharedState, inputDesc?: string) {
  checkShared(sharedState, false, 'runMutateFn');
  const { mutateFns } = getInternal(sharedState);
  const desc = inputDesc || SINGLE_MUTATE; // 未传递任何描述，尝试调用可能存在的单函数

  // 调用 desc 对应的函数
  const item = mutateFns.find(item => item.desc === desc);
  if (!item) return;
  const { fn, task } = item;

  if (task) {
    callMutateFn(sharedState, { sn: 0, task, desc });
    return;
  }
  if (fn) {
    callMutateFn(sharedState, { sn: 0, fn, desc });
  }
}

/** 自动生成 desc，辅助 runMutateFn 之用 */
function injectDesc(fnItem: MutateFnItem | AtomMutateFnItem) {
  if (fnItem.desc) return fnItem;
  const desc = genFnKey('mutate');
  return { ...fnItem, desc };
}

function configOutMutateFn(target: SharedState, fnItem: MutateFnItem | AtomMutateFnItem) {
  const withDescFn = injectDesc(fnItem);
  configMutateFns({ target, fns: [withDescFn], isOut: true });
  return () => runMutateFn(target, withDescFn.desc); // 返回一个呼叫句柄给用户
}

export function runMutateFn(sharedState: SharedState, desc?: string) {
  checkShared(sharedState, false, 'runMutateFn');
  runMutateFnItem(sharedState, desc);
}

export function createMutate(target: SharedDict) {
  return (fnItem: MutateFnItem) => configOutMutateFn(target, fnItem);
}

export function createAtomMutate(target: Atom) {
  return (fnItem: AtomMutateFnItem) => configOutMutateFn(target, fnItem);
}
