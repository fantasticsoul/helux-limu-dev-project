import type { TInternal } from '../creator/buildInternal';
import { getHelp } from '../root';
import { isDebug } from '../../utils';

const sharedScope = getHelp().sharedScope;
const { INTERMAL_MAP } = sharedScope;

export function getInternalMap() {
  return INTERMAL_MAP;
}

export function getInternalByKey(sharedKey: number): TInternal {
  return INTERMAL_MAP[sharedKey];
}

/**
 * see window.__HELUX__.help.shared.INTERMAL_MAP
 */
export function clearInternal(moduleName: string) {
  if (!moduleName) return;
  if (!isDebug()) return;

  let matchedKeys: number[] = [];
  const keys = Object.keys(INTERMAL_MAP);
  for (const key of keys) {
    const item = INTERMAL_MAP[key];
    if (item.moduleName === moduleName) {
      matchedKeys.push(item.sharedKey);
    }
  }

  // 清除头2个即可
  if (matchedKeys.length > 2) {
    Reflect.deleteProperty(INTERMAL_MAP, matchedKeys[0]);
    Reflect.deleteProperty(INTERMAL_MAP, matchedKeys[1]);
  }
}

export function setInternal(key: string, internal: TInternal) {
  INTERMAL_MAP[key] = internal;
  return internal;
}
