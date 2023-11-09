import type { TInternal } from '../creator/buildInternal';
import { getHelp } from '../root';
import { isDebug } from '../../utils';

const { INTERMAL_MAP } = getHelp().sharedScope;

export function getInternalMap() {
  return INTERMAL_MAP;
}

/**
 * for hot reload
 * see window.__HELUX__.help.shared.INTERMAL_MAP
 */
export function clearInternal(moduleName: string, loc: string) {
  if (!moduleName || !isDebug() || !loc) return;

  let matchedKeys: number[] = [];
  INTERMAL_MAP.forEach(item => {
    if (item.moduleName === moduleName && item.loc === loc) {
      matchedKeys.push(item.sharedKey);
    }
  });

  // 清除第一个即可
  if (matchedKeys.length > 1) {
    Reflect.deleteProperty(INTERMAL_MAP, matchedKeys[0]);
  }
}

export function setInternal(key: number, internal: TInternal) {
  INTERMAL_MAP.set(key, internal);
  return internal;
}
