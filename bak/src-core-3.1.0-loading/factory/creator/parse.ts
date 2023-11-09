import { immut } from 'limu';
import { createOb, injectHeluxProto } from '../../helpers/obj';
import { getSharedKey, markSharedKey } from '../../helpers/state';
import type {
  Dict,
  ICreateOptions,
  IInnerCreateOptions,
  IRuleConf,
  KeyBoolDict,
  KeyIdsDict,
  NumStrSymbol,
  MutateFn,
  MutateFnItem,
  ISetStateOptions,
} from '../../types';
import { canUseDeep, isFn, isObj, nodupPush, noop, safeGet, setNoop } from '../../utils';
import { getDepKeyByPath, tryGetLoc } from '../common/util';
import { SINGLE_MUTATE } from '../../consts';

export interface IInnerOptions<T = any> {
  rawState: T | (() => T);
  forAtom?: boolean;
  forGlobal?: boolean;
}

function markSharedKeyOnState(rawState: Dict) {
  injectHeluxProto(rawState);
  const sharedKey = markSharedKey(rawState); // now rawState marked shared key
  return sharedKey;
}

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

const MutateCall = 'mutate';

function parseDesc(fnKey: any, itemDesc: any) {
  return itemDesc || fnKey || MutateCall;
};

function parseMutate(mutate?: IInnerCreateOptions['mutate'] | null) {
  const mutateFns: MutateFnItem[] = [];
  const handleItem = (item: MutateFnItem | MutateFn, inputDesc?: string) => {
    if (isFn(item)) {
      if (item === noop) return;
      const desc = parseDesc(inputDesc, '');
      mutateFns.push({ fn: item, dep: noop, desc, task: null });
    } else if (isObj(item)) {
      if (item.fn === noop) return;
      const desc = parseDesc(inputDesc, item.desc);
      const { fn = noop, dep = noop, task = null } = item;
      mutateFns.push({ fn, desc, dep, task });
    }
  };

  if (Array.isArray(mutate)) {
    if (mutate.length === 1) {
      handleItem(mutate[0], SINGLE_MUTATE); // 标记为单函数
    } else {
      mutate.forEach((item) => handleItem(item));
    }
  } else if (isFn(mutate)) {
    handleItem(mutate, SINGLE_MUTATE); // 标记为单函数
  } else if (isObj(mutate)) {
    Object.keys(mutate).forEach(key => {
      handleItem(mutate[key], key);
    });
  }

  return mutateFns;
}

export function parseOptions(innerOptions: IInnerOptions, options: ICreateOptions = {}) {
  const { forAtom = false, forGlobal = false } = innerOptions;
  const rawState = parseRawState(innerOptions.rawState);
  const sharedKey = markSharedKeyOnState(rawState);
  const moduleName = options.moduleName || '';
  const deep = options.deep ?? true;
  const exact = options.exact ?? true;
  const rules = options.rules || [];
  const before = options.before || noop;
  const mutate = options.mutate || noop;
  const usefulName = moduleName || `${sharedKey}`;
  const loc = tryGetLoc(moduleName);
  const mutateFns = parseMutate(mutate);

  return {
    rawState,
    sharedKey,
    moduleName,
    usefulName,
    forAtom,
    forGlobal,
    loc,
    deep,
    exact,
    rules,
    before,
    mutate,
    mutateFns,
  };
}

export type ParsedOptions = ReturnType<typeof parseOptions>;

/**
 * 解析出 createShared 里配置的 rules
 */
export function parseRules(options: ParsedOptions): IRuleConf {
  const { rawState, sharedKey, deep, rules } = options;
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
      state = immut(rawState, {
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
      state = createOb(rawState, {
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
