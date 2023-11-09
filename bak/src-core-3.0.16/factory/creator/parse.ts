import { immut } from 'limu';
import { SINGLE_CHANGE } from '../../consts';
import { createOb } from '../../helpers/obj';
import { getSharedKey } from '../../helpers/state';
import type {
  Dict,
  ICreateOptions,
  ICreateOptionsType,
  IHeluxParams,
  IInnerCreateOptions,
  IRuleConf,
  KeyBoolDict,
  KeyIdsDict,
  NumStrSymbol,
  ChangeFnDict,
  ChangeFn,
  ISetStateOptions,
} from '../../types';
import { canUseDeep, isFn, isObj, nodupPush, noop, safeGet, setNoop } from '../../utils';
import { getDepKeyByPath } from '../common/util';

export function parseSetOptions<T = any>(options?: ISetStateOptions<T>) {
  if (!options) return;
  // filter valid props
  const { extraDeps, excludeDeps, desc, ids, globalIds } = options;
  return { extraDeps, excludeDeps, desc, ids, globalIds };
}

export function parseRawState<T = Dict>(stateOrStateFn: T | (() => T)) {
  let rawState = stateOrStateFn as T;
  if (isFn(stateOrStateFn)) {
    // TODO  startStateFn endStateFn
    rawState = stateOrStateFn();
  }
  if (!isObj(rawState)) {
    throw new Error('ERR_NON_OBJ: pass an non-object to createShared!');
  }
  if (getSharedKey(rawState)) {
    throw new Error('ERR_ALREADY_SHARED: pass a shared object to createShared!');
  }

  return rawState;
}

function parseChange(change?: IInnerCreateOptions['change']) {
  const changeFnDict: ChangeFnDict = {};
  const changeFnList: ChangeFn[] = [];
  if (Array.isArray(change)) {
    change.forEach(item => {
      if (isFn(item)) {
        changeFnList.push(item);
      } else if (isObj(item)) {
        const { desc, fn } = item;
        changeFnDict[desc] = fn;
      }
    })
  } else if (isObj(change)) {
    Object.keys(change).forEach(key => {
      const val = (change as ChangeFnDict)[key];
      if (isFn(val)) {
        changeFnDict[key] = val;
      }
    })
  } else if (isFn(change)) {
    changeFnDict[SINGLE_CHANGE] = change;
  }

  return { changeFnDict, changeFnList };
}

export function parseOptions(options?: ICreateOptionsType) {
  let enableReactive = false;
  let enableRecordDep = false;
  let copyObj = false;
  let enableSyncOriginal = true;
  let moduleName = '';
  let deep = true;
  let exact = true;
  let rules: ICreateOptions['rules'] = [];
  let watch: ICreateOptions['watch'] = [];
  let mutate: IInnerCreateOptions['mutate'] = noop;
  let change: IInnerCreateOptions['change'] = noop;
  let changeFnDict: ChangeFnDict = {};
  let changeFnList: ChangeFn[] = [];

  // for ts check, write 'typeof options' 3 times
  if (typeof options === 'boolean') {
    enableReactive = options;
  } else if (typeof options === 'string') {
    moduleName = options;
  } else if (options && typeof options === 'object') {
    enableReactive = options.enableReactive ?? false;
    enableRecordDep = options.enableRecordDep ?? false;
    copyObj = options.copyObj ?? false;
    enableSyncOriginal = options.enableSyncOriginal ?? true;
    moduleName = options.moduleName || '';
    deep = options.deep ?? true;
    exact = options.exact ?? true;
    rules = options.rules || [];
    watch = options.watch || [];
    mutate = options.mutate || noop;
    change = options.change || noop;
    const ret = parseChange(change);
    changeFnDict = ret.changeFnDict;
    changeFnList = ret.changeFnList;
  }

  return {
    enableReactive,
    enableRecordDep,
    copyObj,
    enableSyncOriginal,
    moduleName,
    deep,
    exact,
    rules,
    watch,
    mutate,
    change,
    changeFn: { dict: changeFnDict, list: changeFnList },
  };
}

export type ParsedOptions = ReturnType<typeof parseOptions>;

/**
 * 解析出 createShared 里配置的 rules
 */
export function parseRules(heluxParams: IHeluxParams): IRuleConf {
  const { markedState, sharedKey, createOptions } = heluxParams;
  const { deep, rules } = createOptions;
  const idsDict: KeyIdsDict = {};
  const globalIdsDict: KeyIdsDict = {};
  const stopDepInfo: IRuleConf['stopDepInfo'] = { keys: [], isArrDict: {} };
  const isArrDict: KeyBoolDict = {}; // 临时记录是否是数组，后面步骤会转移到 stopDepInfo.isArrDict
  const isDeep = canUseDeep(deep);

  rules.forEach((rule) => {
    // when 函数执行完，会写入读取到的 key 列表
    const confKeys: string[] = [];
    const { when, ids = [], globalIds = [], stopDep = false } = rule;

    let state: any;
    let keyReaded = false;
    if (isDeep) {
      let pervKey = '';
      state = immut(markedState, {
        onOperate: ({ fullKeyPath, value, isBuiltInFnKey }) => {
          if (isBuiltInFnKey) return;
          // 只记录单一路径下读取的最长的那个key，
          // 即 a.b.c 行为会触发 ['a'] ['a','b'] ['a','b','c'] 3次 onOperate 操作
          // 但 confKeys 只记录['a','b','c'] 这一次生成的 key
          const confKey = getDepKeyByPath(fullKeyPath, sharedKey);
          if (pervKey && confKey.includes(pervKey)) {
            // 是一条路径中正在下钻的key，将之前的弹出
            confKeys.pop();
          }
          confKeys.push(confKey);
          isArrDict[confKey] = Array.isArray(value);
          pervKey = confKey;
          keyReaded = true;
        },
      });
    } else {
      state = createOb(markedState, {
        set: setNoop,
        get: (target: Dict, key: any) => {
          const confKey = getDepKeyByPath([key], sharedKey);
          confKeys.push(confKey);
          const value = target[key];
          isArrDict[confKey] = Array.isArray(value);
          keyReaded = true;
          return value;
        },
      });
    }

    const result = when(state);
    // record id, globalId, stopDep
    const setRuleConf = (confKey: string) => {
      const idList = safeGet(idsDict, confKey, [] as NumStrSymbol[]);
      ids.forEach((id) => nodupPush(idList, id));
      const globalIdList = safeGet(globalIdsDict, confKey, [] as NumStrSymbol[]);
      globalIds.forEach((id) => nodupPush(globalIdList, id));
      if (stopDep && isArrDict[confKey]) {
        nodupPush(stopDepInfo.keys, confKey);
        stopDepInfo.isArrDict[confKey] = isArrDict[confKey];
      }
    };
    confKeys.forEach(setRuleConf);

    if (
      keyReaded
      || result === state // 返回了state自身
      || (Array.isArray(result) && result.includes(state)) // 返回了数组，包含有state自身
    ) {
      setRuleConf(`${sharedKey}`);
    }
  });

  return { idsDict, globalIdsDict, stopDepInfo };
}
