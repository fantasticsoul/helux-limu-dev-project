import type { ScopeType } from '../../types';
import { getSafeNext, isMax } from '../../utils';
import { getFnScope, getBlockScope, getInsScope } from './speedup';
import { getRootCtx } from '../root';

export function genInsKey() {
  const insScope = getInsScope();
  const nextKey = getSafeNext(insScope.keySeed);
  insScope.keySeed = nextKey;
  return nextKey;
}

export function genBlockKey() {
  const blockScope = getBlockScope();
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
  const ctx = getRootCtx();
  const renderSN = ctx.renderSN;
  const nextNo = renderSN === Number.MAX_VALUE ? 1 : renderSN + 1;
  ctx.renderSN = nextNo;
  return nextNo;
}

export function genFnKey(scopeType: ScopeType) {
  const fnScope = getFnScope();
  const keyMap = fnScope.keySeed;
  const keySeed = getSafeNext(keyMap[scopeType]);
  keyMap[scopeType] = keySeed;
  const prefix = scopeType === 'static' ? 's' : 'h';
  return `${prefix}${keySeed}`;
}
