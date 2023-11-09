import { getHelp } from '../root';
import { getSafeNext, isMax } from '../../utils';
import type { ScopeType } from '../../types';

const { insScope, blockScope, fnScope } = getHelp();

export function genInsKey() {
  const nextKey = getSafeNext(insScope.keySeed);
  insScope.keySeed = nextKey;
  return nextKey;
}

export function genBlockKey() {
  const { keySeed, keyPrefix } = blockScope;
  const nextKey = getSafeNext(keySeed);
  blockScope.keySeed = nextKey;

  let prefix = keyPrefix;
  if (isMax(keySeed)) {
    prefix = getSafeNext(keyPrefix);
    blockScope.keyPrefix = prefix;
  }
  return `${prefix}_${nextKey}`;
}

export function genRenderSN() {
  const help = getHelp();
  const renderSN = help.renderSN;
  const nextNo = renderSN === Number.MAX_VALUE ? 1 : renderSN + 1;
  help.renderSN = nextNo;
  return nextNo;
}

export function genFnKey(scopeType: ScopeType) {
  const keyMap = fnScope.keySeed;
  const keySeed = getSafeNext(keyMap[scopeType]);
  keyMap[scopeType] = keySeed;
  const prefix = scopeType === 'static' ? 's' : 'h';
  return `${prefix}${keySeed}`;
}
