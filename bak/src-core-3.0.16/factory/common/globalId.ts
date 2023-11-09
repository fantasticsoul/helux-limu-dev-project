import type { Dict, NumStrSymbol } from '../../types';
import { delListItem, nodupPush, safeMapGet } from '../../utils';
import type { TInternal } from '../creator/buildInternal';
import { getFnScope } from './speedup';
import { getRootCtx } from '../root';

export function getGlobalIdInsKeys(id: NumStrSymbol) {
  const { GID_INSKEYS_MAP } = getFnScope();
  return safeMapGet(GID_INSKEYS_MAP, id, [] as number[]);
}

export function getGlobalInternal() {
  return getRootCtx().globalInternal;
}

export function getGlobalShared() {
  return getRootCtx().globalShared;
}

export function setGlobalInternal(internal: TInternal) {
  getRootCtx().globalInternal = internal;
}

export function setGlobalShared(shared: Dict) {
  getRootCtx().globalShared = shared;
}

export function mapGlobalId(id: NumStrSymbol, insKey: number) {
  if (!id) return;
  const keys = getGlobalIdInsKeys(id);
  nodupPush(keys, insKey);
}

export function delGlobalId(id: NumStrSymbol, insKey: number) {
  if (!id) return;
  const keys = getGlobalIdInsKeys(id);
  delListItem(keys, insKey);
}
