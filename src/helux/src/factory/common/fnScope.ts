import { getHelp } from '../root';
import { genFnKey } from '../common/key';
import type { ScopeType, Dict, IFnCtx } from '../../types';
import { EXPIRE_MS, NOT_MOUNT, SIZE_LIMIT, UNMOUNT, FN_KEY } from '../../consts';
import { isFn, isObj, isDebug, safeMapGet, delListItem } from '../../utils';

const { fnScope: scope } = getHelp();
const { DEPKEY_FNKEYS_MAP, FNKEY_HOOK_CTX_MAP, FNKEY_STATIC_CTX_MAP, DEPKEY_COMPUTING_FNKEYS_MAP: DEPKEY_RUNNING_FNKEYS_MAP } = scope;

export function getCtxMap(scopeKeyOrFnKey: string) {
  const map = scopeKeyOrFnKey[0] === 's' ? FNKEY_STATIC_CTX_MAP : FNKEY_HOOK_CTX_MAP;
  return map;
}

export function putComputingFnKey(depKey: string, fnKey: string) {
  const fnKeys = safeMapGet(DEPKEY_RUNNING_FNKEYS_MAP, depKey, [] as string[]);
  fnKeys.push(fnKey);
}

export function delComputingFnKey(depKey: string, fnKey: string) {
  const fnKeys = DEPKEY_RUNNING_FNKEYS_MAP.get(depKey);
  if (fnKeys) {
    delListItem(fnKeys, fnKey)
  }
}

export function shouldShowComputing(depKeys: string[]) {
  let ret = false;
  for (const depKey of depKeys) {
    const fnKeys = DEPKEY_RUNNING_FNKEYS_MAP.get(depKey) || [];
    if (fnKeys.length > 0) {
      ret = true;
      break;
    }
  }
  return ret;
}

export function delRunninFnKey() {
  scope.runningFnKey = '';
  scope.runningSharedState = null;
}

/**
 * 删除已记录的相关依赖数据
 */
export function delFnDepData(fnCtx: IFnCtx) {
  const { depKeys, fnKey } = fnCtx;
  depKeys.forEach((key) => {
    const fnKeys = DEPKEY_FNKEYS_MAP.get(key) || [];
    const idx = fnKeys.indexOf(fnKey);
    if (idx >= 0) {
      fnKeys.splice(idx, 1);
    }
  });
}

export function delHistoryUnmoutFnCtx() {
  const { FNKEY_HOOK_CTX_MAP } = scope;
  // works for strict mode
  if (FNKEY_HOOK_CTX_MAP.size >= SIZE_LIMIT) {
    const now = Date.now();
    FNKEY_HOOK_CTX_MAP.forEach((fnCtx) => {
      const { mountStatus, createTime, fnKey } = fnCtx;
      if ([NOT_MOUNT, UNMOUNT].includes(mountStatus) && now - createTime > EXPIRE_MS) {
        delFnDepData(fnCtx);
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        // deleting item in map.forEach is doable
        FNKEY_HOOK_CTX_MAP.delete(fnKey);
      }
    });
  }
}

/**
 * for hot reload
 * see window.__HELUX__.help.fnDep.FNKEY_HOOK_CTX_MAP
 */
export function markFnExpired() {
  if (isDebug()) {
    // for hot reload working well
    FNKEY_HOOK_CTX_MAP.forEach((item) => {
      item.isExpired = true;
    });
  }
}

export function markFnKey(fnOrObj: Dict, scopeType: ScopeType, fnKey?: string) {
  const fnKeyStr = fnKey || genFnKey(scopeType);
  if (isFn(fnOrObj)) {
    // @ts-ignore
    fnOrObj[FN_KEY] = fnKeyStr;
  } else {
    fnOrObj.__proto__[FN_KEY] = fnKeyStr;
  }
  return fnKeyStr;
}

export function getFnKey(fnOrObj: Dict): string {
  if (isFn(fnOrObj)) {
    // @ts-ignore
    return fnOrObj[FN_KEY] || '';
  }
  if (isObj(fnOrObj)) {
    // @ts-ignore
    return fnOrObj.__proto__[FN_KEY] || '';
  }
  return '';
}

export function getFnCtx(fnKey: string) {
  const map = getCtxMap(fnKey);
  return map.get(fnKey);
}

export function getFnCtxByObj(obj: Dict) {
  const fnKey = getFnKey(obj);
  return getFnCtx(fnKey) || null;
}

export function getRunninFnCtx() {
  if (!scope.runningFnKey) {
    return null;
  }
  return getFnCtx(scope.runningFnKey);
}
