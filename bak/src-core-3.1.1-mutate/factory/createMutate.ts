import { callMutateFn, configMutateFns } from './creator/mutateFn';
import { checkShared } from './common/check';
import { genFnKey } from './common/key';
import { getInternal } from '../helpers/state';
import type { SharedState, MutateFnItem, SharedDict, Atom, AtomMutateFnItem } from '../types';
import { SINGLE_MUTATE } from '../consts';

function runMutateFnItem(options: { target: SharedState, desc?: string, isOut?: boolean }) {
  const { target, desc: inputDesc = '', isOut = true } = options;
  const { mutateFns, outMutateFnDict } = getInternal(target);
  const desc = inputDesc || SINGLE_MUTATE; // 未传递任何描述，尝试调用可能存在的单函数

  let item;
  if (isOut) {
    item = outMutateFnDict[desc];
  } else {
    item = mutateFns.find(item => item.desc === desc);
  }
  if (!item) return;
  // 调用 desc 对应的函数
  callMutateFn(target, { ...item, isOut });
}

/** 自动生成 desc，辅助 runMutateFn 之用 */
function injectDesc(fnItem: MutateFnItem | AtomMutateFnItem) {
  if (fnItem.desc) return fnItem;
  const desc = genFnKey('mutate');
  return { ...fnItem, desc };
}

/**
 * 创建一个外部执行的 mutate 函数（ 即不定义在生成 share 或 atom 是的 options 参数里，生成后再定义 mutate 函数 ）
 */
function configMutateFn(options: { target: SharedState, fnItem: MutateFnItem | AtomMutateFnItem, forAtom?: boolean, label: string }) {
  const { target, fnItem, forAtom = false, label } = options;
  checkShared(target, forAtom, label);
  const withDescFn = injectDesc(fnItem);
  configMutateFns({ target, fns: [withDescFn], isOut: true });
  return {
    call: () => runMutateFnItem({ target, desc: withDescFn.desc }), // 返回一个呼叫句柄给用户
    desc: withDescFn.desc || '',
  }
}

/**
 * 执行匹配 desc 的 mutate 函数
 */
export function runMutateFn(target: SharedState, desc?: string) {
  checkShared(target, false, 'runMutateFn');
  runMutateFnItem({ target, desc });
}

/**
 * 执行匹配 desc 的 mutate 函数
 */
export function runAtomMutateFn(target: Atom, desc?: string) {
  checkShared(target, true, 'runAtomMutateFn');
  runMutateFnItem({ target, desc });
}

/**
 * 为 shared 创建一个 mutate 函数，更详细的泛型定义见 types-api.d.ts
 */
export function mutate(target: SharedDict) {
  return (fnItem: MutateFnItem<any, any>) => configMutateFn({ target, fnItem, label: 'mutate' });
}

/**
 * 为 atom 创建一个 mutate 函数，更详细的泛型定义见 types-api.d.ts
 */
export function atomMutate(target: Atom) {
  return (fnItem: AtomMutateFnItem<any, any>) => configMutateFn({ target, fnItem, label: 'atomMutate', forAtom: true });
}
