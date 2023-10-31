import { HAS_SYMBOL, IS_ATOM, IS_DERIVED_ATOM } from '../../consts';
import { getHelp, getMarkAtomMap } from '../root';
import { Atom, DerivedAtom, AtomValType } from '../../types';

const { insDepScope, blockDepScope } = getHelp();
const markAtomMap = getMarkAtomMap();

function isMax(input: number) {
  return input === Number.MAX_SAFE_INTEGER;
}

export function getSafeNext(input: number) {
  const num = isMax(input) ? 1 : input + 1;
  return num;
}

export function genInsKey() {
  const nextKey = getSafeNext(insDepScope.keySeed);
  insDepScope.keySeed = nextKey;
  return nextKey;
}

export function genBlockKey() {
  const { keySeed, keyPrefix } = blockDepScope;
  const nextKey = getSafeNext(keySeed);
  blockDepScope.keySeed = nextKey;

  let prefix = keyPrefix;
  if (isMax(keySeed)) {
    prefix = getSafeNext(keyPrefix);
    blockDepScope.keyPrefix = prefix;
  }
  return `${prefix}_${nextKey}`;
}

export function isAtom(mayAtom: any): mayAtom is Atom {
  if (!mayAtom) {
    return false;
  }
  if (!HAS_SYMBOL) {
    return markAtomMap.get(mayAtom) || false;
  }
  return mayAtom[IS_ATOM];
}

export function isDerivedAtom(mayAtomDerived: any): mayAtomDerived is DerivedAtom {
  if (!mayAtomDerived) {
    return false;
  }
  return mayAtomDerived[IS_DERIVED_ATOM] || false;
}

export function getRenderSN() {
  const help = getHelp();
  const renderSN = help.renderSN;
  const nextNo = renderSN === Number.MAX_VALUE ? 1 : renderSN + 1;
  help.renderSN = nextNo;
  return nextNo;
}

export function getAtom<T extends any = any>(mayAtom: T): AtomValType<T> {
  if (isAtom(mayAtom) || isDerivedAtom(mayAtom)) {
    return mayAtom.val;
  }
  // @ts-ignore trust AtomValType unbox type operation
  return mayAtom;
}
