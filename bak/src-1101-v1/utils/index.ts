import type { Dict, Fn, NumStrSymbol } from '../types';

// @ts-ignore
const canUseReflect = !!Reflect;
const hasProp = Object.prototype.hasOwnProperty;

// @ts-ignore
export const GLOBAL_REF: Dict & Window & typeof globalThis = window || global;

export function has(obj: any, key: any) {
  if (canUseReflect) {
    return Reflect.has(obj, key);
  }
  return hasProp.call(obj, key);
}

export function setNoop() {
  warn('changing shared state is invalid');
  return true;
}

export function isDebug() {
  if (
    !!GLOBAL_REF.location?.port
    || GLOBAL_REF.name === 'previewFrame' // for stackblitz
    || GLOBAL_REF.BrowserFS // for codesandbox
  ) {
    return true;
  }
  return false;
}

export function asType<T extends any = any>(val: any) {
  // return val as unknown as T;
  const typedVal: any = val;
  return typedVal as unknown as T;
}

/** safe obj get */
export function safeGet<T = any>(obj: Record<NumStrSymbol, any>, key: NumStrSymbol, defaultValue: T): T {
  let item = obj[key];
  if (!item) {
    item = obj[key] = defaultValue;
  }
  return item;
}

/** safe map get */
export function safeMapGet<T = any>(map: Map<NumStrSymbol, any>, key: NumStrSymbol, defaultValue: T): T {
  let item = map.get(key);
  if (!item) {
    map.set(key, defaultValue);
    item = defaultValue;
  }
  return item;
}

export function nodupPush(list: NumStrSymbol[], toPush: NumStrSymbol) {
  if (!list.includes(toPush)) list.push(toPush);
}

export function delListItem(list: NumStrSymbol[], toDel: NumStrSymbol) {
  const idx = list.indexOf(toDel);
  if (idx >= 0) {
    list.splice(idx, 1);
  }
}

export function isObj(mayObj: any): mayObj is Dict {
  return mayObj && typeof mayObj === 'object' && !Array.isArray(mayObj);
}

export function isFn(mayFn: any): mayFn is Fn {
  return typeof mayFn === 'function';
}

export function isAsyncFn(mayFn: any): mayFn is Fn {
  const str = Object.prototype.toString.call(mayFn);
  return str === '[object AsyncFunction]';
}

export function isSymbol(maySymbol: any): maySymbol is symbol {
  return typeof maySymbol === 'symbol';
}

export function isPromise(mayObj: any) {
  if (!mayObj) {
    return false;
  }
  const objType = typeof mayObj;
  return (objType === 'object' || objType === 'function') && isFn(mayObj.then);
}

export function warn(msg: string) {
  console.warn?.(msg);
}

export function dedupList(list: Array<any>) {
  return Array.from(new Set(list));
}

export function noop(...any: any[]): any { }

export function prefixValKey(valKey: string, sharedKey: number) {
  return `${sharedKey}/${valKey}`;
}

export function canUseProxy() {
  return typeof Proxy === 'function';
}

export function canUseDeep(isDeep: boolean) {
  return isDeep && canUseProxy();
}

export function getVal(obj: any, keyPath: string[]): any {
  let val;
  let parent = obj;
  keyPath.forEach(key => {
    val = parent[key];
    parent = val;
  });
  return val;
}

export function setVal(obj: any, keyPath: string[], val: any) {
  let parent = obj;
  const lastIdx = keyPath.length;
  keyPath.forEach((key, idx) => {
    if (idx !== lastIdx) {
      parent = obj[key];
    } else {
      parent[key] = val;
    }
  });
}

export function ensureList<T extends any = any>(mayList: T | T[]): T[] {
  if (Array.isArray(mayList)) {
    return mayList;
  }
  return [mayList];
}

export function isMax(input: number) {
  return input === Number.MAX_SAFE_INTEGER;
}

export function getSafeNext(input: number) {
  const num = isMax(input) ? 1 : input + 1;
  return num;
}

export function tryAlert(err: any) {
  let label = err;
  if (isDebug()) {
    if (err instanceof Error) {
      label = err.message;
    }
    // TODO see if has errHandler
    label && GLOBAL_REF.alert?.(`${label}, see details in console.`);
  }
  console.error(err);
}

export function tryWarn(err: any) {
  console.error(err);
}
