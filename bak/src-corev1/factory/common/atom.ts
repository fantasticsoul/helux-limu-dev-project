import { HAS_SYMBOL, IS_ATOM, IS_DERIVED_ATOM } from '../../consts';
import { Atom, AtomValType, DerivedAtom } from '../../types';
import { getHelp } from '../root';

const { markAtomMap } = getHelp();

export function getMarkAtomMap() {
  return markAtomMap;
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

export function getAtom<T extends any = any>(mayAtom: T): AtomValType<T> {
  if (isAtom(mayAtom) || isDerivedAtom(mayAtom)) {
    return mayAtom.val;
  }
  // @ts-ignore trust AtomValType unbox type operation
  return mayAtom;
}
