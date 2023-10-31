import { getHelp, getHeluxRoot } from '../root';
import type { Dict, NumStrSymbol } from '../../types';
import { delListItem, nodupPush, safeMapGet } from '../../utils';
import type { TInternal } from './buildInternal';

const { GID_INSKEYS_MAP } = getHelp().fnDepScope;
const root = getHeluxRoot();

export function getGlobalIdInsKeys(id: NumStrSymbol) {
  return safeMapGet(GID_INSKEYS_MAP, id, [] as number[]);
}

export function getGlobalInternal() {
  return root.globalInternal;
}

export function getGlobalShared() {
  return root.globalShared;
}

export function setGlobalInternal(internal: TInternal) {
  root.globalInternal = internal;
}

export function setGlobalShared(shared: Dict) {
  root.globalShared = shared;
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
