import { immut } from 'limu';
import type {
  Dict, IMutateFnParams, ICreateOptionsType, ICreateOptions, IInnerCreateOptions, IHeluxParams,
  IRuleConf, KeyIdsDict, NumStrSymbol, KeyBoolDict,
} from '../../types';
import { isFn, isObj, noop, safeGet, nodupPush, canUseDeep, setNoop } from '../../utils';
import { getSharedKey } from '../../helpers/state';
import { createOb } from '../../helpers/obj';
import { getDepKeyByPath } from '../common/util';

export function parseRawState<T extends Dict = Dict>(stateOrStateFn: T | (() => T)) {
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
  let change: IInnerCreateOptions['change'] = {};

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
    change = options.change || {};
  }

  // 辅助 change 配置
  const mutateWrap = (params: IMutateFnParams) => {
    const changeFn = change[params.desc] || noop;
    changeFn(params.draft);
    mutate(params); // 会继续触发用户定义的 mutate
  };

  return {
    enableReactive, enableRecordDep, copyObj, enableSyncOriginal, moduleName,
    deep, exact, rules, watch, mutate, change, mutateWrap,
  };
}

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
