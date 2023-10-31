import { IOperateParams, createDraft, finishDraft, immut } from 'limu';
import { KEY_SPLITER, SHARED_KEY } from '../consts';
import * as fnDep from '../helpers/fndep';
import { runInsUpdater } from '../helpers/ins';
import { createHeluxObj, createOb, injectHeluxProto } from '../helpers/obj';
import { bindInternal, getInternal, getSharedKey, mapSharedState, markSharedKey, record } from '../helpers/state';
import { dedupList, isFn, isObj, isSymbol, nodupPush, delListItem, prefixValKey, safeGet, warn, setNoop, canUseDeep } from '../utils';
import { buildInternal, InsCtxDef, TInternal } from './common/buildInternal';
import type {
  Dict, DictN, EenableReactive, Fn, ICreateOptions, IHeluxParams,
  InnerCreateOptions, ModuleName, TriggerReason, ISetStateOptions,
} from '../types';

/** 这个是给 helux-signal 使用的数据，目前暂时还用不上 */
let depStats: DictN<Array<string>> = {};

function mapDepStats(sharedKey: number) {
  const keys = safeGet(depStats, sharedKey, []);
  return keys;
}

function recordDep(sharedKey: number, valKey: string | symbol) {
  const keys = mapDepStats(sharedKey);
  nodupPush(keys, valKey);
}

function getDepKeyByPath(fullKeyPath: string[], sharedKey: number) {
  return prefixValKey(fullKeyPath.join(KEY_SPLITER), sharedKey);
}

function handleOperate(
  opParams: IOperateParams,
  heluxParams: IHeluxParams,
  ctx: { writeKeyPathInfo: Dict<TriggerReason>, ids: string[], writeKeys: Dict, writeKey2Ids: Record<string, string[]> },
) {
  const { isChange, fullKeyPath, keyPath, parentType } = opParams;
  const { moduleName, sharedKey, createOptions } = heluxParams;
  const { writeKeyPathInfo, ids, writeKeys, writeKey2Ids } = ctx;
  if (!isChange) return;

  const initialKey = prefixValKey('', sharedKey); // namespace key
  const curWriteKey = getDepKeyByPath(fullKeyPath, sharedKey);
  writeKeyPathInfo[curWriteKey] = { sharedKey, moduleName, keyPath: fullKeyPath };

  // 设定了非精确更新策略时，提取出更新路径上的所有父级路径
  if (!createOptions.exact) {
    // fullKeyPath.reduce((acc, next, idx) => {
    //   const spliter = idx === 0 ? '' : KEY_SPLITER;
    //   const key = `${acc}${spliter}${next}`;
    //   writeKeys[key] = 1;
    //   return key;
    // }, initialKey);

    const level1Key = `${initialKey}${fullKeyPath[0]}`;
    writeKeys[level1Key] = 1;

  } else { // 用户设定了精确更新策略，则只查当前更新路径的视图
    let writeKey = curWriteKey;
    if (parentType === 'Array') {
      writeKey = prefixValKey(keyPath.join(KEY_SPLITER), sharedKey);
    }
    writeKeys[writeKey] = 1;

    // find update ids configured in rules
    Object.keys(writeKey2Ids).forEach((confWriteKey) => {
      // writeKey: 1/a|list|0|name 
      // confWriteKey: 1/a|list
      if (writeKey.startsWith(confWriteKey)) {
        writeKey2Ids[confWriteKey].forEach(id => nodupPush(ids, id));
      }
    });
  }
}

/**
 * 解析出 createShared 里配置的 rules
 */
function parseRules(heluxParams: IHeluxParams) {
  const { markedState, sharedKey, createOptions } = heluxParams;
  const { isDeep, rules } = createOptions;
  const writeKey2Ids: Record<string, string[]> = {};
  const deepMode = canUseDeep(isDeep);

  rules.forEach(rule => {
    const writeKeys: string[] = [];
    let state: any;
    if (deepMode) {
      let pervKey = '';
      state = immut(markedState, {
        onOperate: ({ fullKeyPath }) => {
          // 只记录单一路径下读取的最长的那个key，
          // 即 a.b.c 行为会触发 ['a'] ['a','b'] ['a','b','c'] 3次 onOperate 操作
          // 但 writeKeys 只记录['a','b','c'] 这一次生成的 key 
          const writeKey = getDepKeyByPath(fullKeyPath, sharedKey);
          if (pervKey && writeKey.includes(pervKey)) {
            // 是单一路径下钻的key，将之前的弹出
            writeKeys.pop();
          }
          writeKeys.push(writeKey);
          pervKey = writeKey;
        },
        extraProps: { [SHARED_KEY]: sharedKey },
      });
    } else {
      state = createOb(
        markedState,
        {
          set: setNoop,
          get: (target: Dict, key: any) => {
            const writeKey = getDepKeyByPath([key], sharedKey);
            writeKeys.push(writeKey);
            return target[key];
          },
        },
      );
    }

    const result = rule.when(state);
    const setId = (writeKey: string) => {
      const ids = safeGet(writeKey2Ids, writeKey, []);
      rule.ids.forEach(id => nodupPush(ids, id));
    };
    writeKeys.forEach(setId);

    if (result === state || (Array.isArray(result) && result.includes(state))) {
      setId(`${sharedKey}`);
    }
  });
  return writeKey2Ids;
}

/** 干预 setState 调用结束后收集到的依赖项（新增或删除） */
function interveneDeps(heluxParams: IHeluxParams, ctx: { depKeys: string[], fn?: Fn, add: boolean }) {
  const { depKeys, fn, add } = ctx;
  if (isFn(fn)) {
    const { markedState, sharedKey, createOptions } = heluxParams;
    const { isDeep } = createOptions;
    const deepMode = canUseDeep(isDeep);
    let state: any;
    const record = (keyPath: string[]) => {
      const depKey = getDepKeyByPath(keyPath, sharedKey);
      add ? nodupPush(depKeys, depKey) : delListItem(depKeys, depKey);
    };

    if (deepMode) {
      state = immut(markedState, {
        onOperate: ({ fullKeyPath }) => record(fullKeyPath),
        extraProps: { [SHARED_KEY]: sharedKey },
      });
    } else {
      state = createOb(
        markedState,
        {
          set: setNoop,
          get: (target: Dict, key: any) => {
            record([key]);
            return target[key];
          },
        },
      );
    }

    fn(state);
  }
}

export function parseOptions(options?: ModuleName | EenableReactive | ICreateOptions) {
  let enableReactive = false;
  let enableRecordDep = false;
  let copyObj = false;
  let enableSyncOriginal = true;
  let moduleName = '';

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
  }

  return { enableReactive, enableRecordDep, copyObj, enableSyncOriginal, moduleName };
}

function parseRawState<T extends Dict = Dict>(stateOrStateFn: T | (() => T)) {
  let rawState = stateOrStateFn as T;
  if (isFn(stateOrStateFn)) {
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

function getHeluxParams(rawState: Dict, createOptions: InnerCreateOptions): IHeluxParams {
  const { copyObj, enableSyncOriginal, moduleName } = createOptions;
  let markedState; // object marked shared key
  let shouldSync = false;
  if (copyObj) {
    shouldSync = enableSyncOriginal;
    markedState = createHeluxObj(rawState);
  } else {
    markedState = injectHeluxProto(rawState);
  }
  const sharedKey = markSharedKey(markedState);
  return { rawState, markedState, shouldSync, sharedKey, createOptions, moduleName: moduleName || `${sharedKey}` };
}

/**
 * 创建全局使用的共享对象，可提供给 useShared useDerived useWatch derived watch 函数使用
 */
function buildSharedState(heluxParams: IHeluxParams) {
  let sharedState: Dict = {};
  const { rawState, markedState, sharedKey, shouldSync, createOptions } = heluxParams;
  const { enableReactive, enableRecordDep, isDeep } = createOptions;
  const collectDep = (key: string) => {
    const depKey = prefixValKey(key, sharedKey);
    if (enableRecordDep) {
      recordDep(sharedKey, depKey);
    }
    // using shared state in derived/watch callback
    fnDep.recordValKeyDep(depKey, { sharedKey });
  };

  if (canUseDeep(isDeep)) {
    sharedState = immut(markedState, {
      onOperate: (params) => {
        collectDep(params.fullKeyPath.join(KEY_SPLITER));
      },
      extraProps: { [SHARED_KEY]: sharedKey },
    });
  } else {
    sharedState = createOb(
      markedState, {
      set: (target: Dict, key: any, val: any) => {
        if (enableReactive) {
          markedState[key] = val;
          if (shouldSync) {
            rawState[key] = val;
          }

          // TODO: add nextTick mechanism to control update frequency?
          getInternal(markedState).setState({ [key]: val });
        } else {
          warn('changing shared state is invalid');
        }
        return true;
      },
      get: (target: Dict, key: any) => {
        if (isSymbol(key)) {
          return target[key];
        }
        collectDep(key);
        return target[key];
      },
    });
  }
  mapSharedState(sharedKey, sharedState);

  return sharedState;
}

function execDepFnAndInsUpdater(
  state: Dict,
  ctx: {
    ids: string[], depKeys: string[], triggerReasons: TriggerReason[], internal: TInternal,
    key2InsKeys: Record<string, number[]>, id2InsKeys: Record<string, number[]>,
    insCtxMap: Map<number, InsCtxDef>,
  },
) {
  const { ids, depKeys, triggerReasons, internal, key2InsKeys, id2InsKeys, insCtxMap } = ctx;
  console.log('find depKeys ', depKeys);
  internal.ver += 1;
  // find associate ins keys
  let allInsKeys: number[] = [];
  // find associate derived/watch fn ctxs
  let allFirstLevelFnKeys: string[] = [];
  let allAsyncFnKeys: string[] = [];
  const runCountStats: Dict<number> = {};

  depKeys.forEach((key) => {
    allInsKeys = allInsKeys.concat(key2InsKeys[key] || []);
    const { firstLevelFnKeys, asyncFnKeys } = fnDep.getDepFnStats(key, runCountStats);
    allFirstLevelFnKeys = allFirstLevelFnKeys.concat(firstLevelFnKeys);
    allAsyncFnKeys = allAsyncFnKeys.concat(asyncFnKeys);
  });
  // find update-id's ins keys
  ids.forEach(id => {
    allInsKeys = allInsKeys.concat(id2InsKeys[id] || []);
  });

  // deduplicate
  allInsKeys = dedupList(allInsKeys);
  allFirstLevelFnKeys = dedupList(allFirstLevelFnKeys);
  allAsyncFnKeys = dedupList(allAsyncFnKeys);

  // start execute compute/watch fns
  allAsyncFnKeys.forEach((fnKey) => fnDep.markComputing(fnKey, runCountStats[fnKey]));
  allFirstLevelFnKeys.forEach((fnKey) => fnDep.runFn(fnKey, { updateReasons: triggerReasons }));

  // start update
  allInsKeys.forEach((insKey) => {
    runInsUpdater(insCtxMap.get(insKey), state);
  });
};

function bindInternalToShared(sharedState: Dict, heluxParams: IHeluxParams) {
  const { markedState, rawState, shouldSync, sharedKey, createOptions, moduleName } = heluxParams;
  const { isDeep } = createOptions;
  const insCtxMap = new Map<number, InsCtxDef>();
  const key2InsKeys: Record<string, number[]> = {};
  // id --> insKeys 
  const id2InsKeys: Record<string, number[]> = {};
  const writeKey2Ids = parseRules(heluxParams);
  const deepMode = canUseDeep(isDeep);

  const internal = buildInternal(heluxParams, {
    /** setState implementation */
    setState: (partialState: Dict | ((rawStateOrDraft: Dict) => Dict), options: ISetStateOptions = {}) => {
      // do nothing
      if (partialState === internal.rawStateSnap) {
        return partialState;
      }

      let depKeys: string[] = [];
      let triggerReasons: TriggerReason[] = [];
      const ids: string[] = [];
      const handleState = (state: Dict) => {
        Object.assign(markedState, state);
        if (deepMode) { // now state is a structurally shared obj generated by limu
          internal.rawStateSnap = state;
        } else {
          if (shouldSync) {
            Object.assign(rawState, state);
          }
          internal.rawStateSnap = { ...markedState };
        }
        interveneDeps(heluxParams, { depKeys, add: true, fn: options.extraDeps });
        interveneDeps(heluxParams, { depKeys, add: false, fn: options.excludeDeps });
        execDepFnAndInsUpdater(state, { internal, ids, depKeys, triggerReasons, key2InsKeys, id2InsKeys, insCtxMap });
      };

      // deep 模式修改： setState(draft=>{draft.x.y=1})
      if (isFn(partialState) && deepMode) {
        const writeKeys: Dict = {};
        const writeKeyPathInfo: Dict<TriggerReason> = {};
        const draft = createDraft(markedState, {
          onOperate(opParams) {
            handleOperate(opParams, heluxParams, { ids, writeKeys, writeKeyPathInfo, writeKey2Ids });
          },
        });

        // returnedPartial 是为了对齐非deep模式的 setState，这个只支持一层依赖收集
        const returnedPartial = partialState(draft); // now partialState is a draft recipe callback
        const nextState = finishDraft(draft); // a structurally shared state generated by limu
        depKeys = Object.keys(writeKeys);
        // 把深依赖和迁依赖收集到的keys合并起来
        if (isObj(returnedPartial)) {
          Object.keys(returnedPartial).forEach(key => nodupPush(depKeys, key));
        }

        triggerReasons = Object.values(writeKeyPathInfo);
        handleState(nextState);

        return internal.rawStateSnap;
      }

      const newPartial: Dict = {};
      const mayChangedKeys: string[] = [];
      const returnedPartial = isFn(partialState)
        ? partialState(
          createOb(
            markedState,
            // 为了和 createDeepShared 返回的 setState 保持行为一致
            {
              set: (target: Dict, key: any, val: any) => {
                newPartial[key] = val;
                return true;
              },
              get: (target: Dict, key: any) => {
                mayChangedKeys.push(key);
                return target[key];
              },
            },
          ),
        )
        : partialState;

      /**
       * 兼容非 deepShared 模式下用户的以下代码
       * ```txt
       * setState(state=>({a: state.a + 1}));
       * setState(state=>(state.a = state.a + 1));
       * setState(state=>{state.a = state.a + 1; return { b: state.a + 1 }});
       * ```
       */
      Object.assign(newPartial, returnedPartial);
      /**
       * 让非 deepShared 模式下用户的以下代码，能够推导出 a 发生了改变
       * ```txt
       * setState(state=>(state.a.b = 1));
       * ```
       * 注意此处可能发生误判，例如下面写法，会猜测为 state.a state.b 均发生了改变
       * 为了能够正确触发渲染而妥协允许存在冗余渲染，这是在浅收集模式下使用 mutable 修改状态没办法避免的事情
       * ```txt
       * setState(state=>(state.a.b = state.b.n + 1 ));
       * ```
       */
      mayChangedKeys.forEach(key => {
        newPartial[key] = markedState[key];
      });

      Object.keys(newPartial).forEach((key) => {
        const depKey = prefixValKey(key, sharedKey);
        depKeys.push(depKey);
        triggerReasons.push({ sharedKey, moduleName, keyPath: [depKey] });
      });
      handleState(newPartial);
      return internal.rawStateSnap;
    },
    insCtxMap,
    key2InsKeys,
    id2InsKeys,
  });

  bindInternal(sharedState, internal);
}

export function setShared(sharedList: Dict[]) {
  sharedList.forEach((shared) => mapDepStats(getSharedKey(shared)));
}

export function getDepStats() {
  const curDepStats = depStats;
  depStats = {};
  return curDepStats;
}

export function buildSharedObject<T extends Dict = Dict>(stateOrStateFn: T | (() => T), options: InnerCreateOptions): [T, Fn] {
  const rawState = parseRawState(stateOrStateFn);
  const heluxParams = getHeluxParams(rawState, options);
  const sharedState = buildSharedState(heluxParams);
  bindInternalToShared(sharedState, heluxParams);
  record(options.moduleName, sharedState);

  return [sharedState, getInternal(sharedState).setState];
}
