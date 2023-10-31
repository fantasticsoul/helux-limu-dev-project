import { IOperateParams, createDraft, finishDraft, immut } from 'limu';
import { KEY_SPLITER, SHARED_KEY } from '../consts';
import * as fnDep from '../helpers/fndep';
import { runInsUpdater } from '../helpers/ins';
import { createHeluxObj, createOb, injectHeluxProto } from '../helpers/obj';
import { bindInternal, clearInternal, getInternal, getSharedKey, mapSharedState, markSharedKey, record } from '../helpers/state';
import { dedupList, isFn, isObj, isSymbol, nodupPush, delListItem, prefixValKey, safeGet, warn, setNoop, canUseDeep } from '../utils';
import { buildInternal, InsCtxDef, TInternal } from './common/buildInternal';
import type {
  Dict, DictN, Fn, ICreateOptions, IHeluxParams, IInsCtx, ICreateOptionsType, TriggerReason, ISetStateOptions, ICreateOptionsFull,
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
  opts: { internal: TInternal, writeKeyPathInfo: Dict<TriggerReason>, ids: string[], writeKeys: Dict, writeKey2Ids: Record<string, string[]> },
) {
  const { isChange, fullKeyPath, keyPath, parentType } = opParams;
  const { writeKeyPathInfo, ids, writeKeys, writeKey2Ids, internal } = opts;
  const { moduleName, sharedKey, createOptions } = internal;
  if (!isChange) return;

  const initialKey = prefixValKey('', sharedKey); // namespace key
  const curWriteKey = getDepKeyByPath(fullKeyPath, sharedKey);
  writeKeyPathInfo[curWriteKey] = { sharedKey, moduleName, keyPath: fullKeyPath };

  // 设定了非精确更新策略时，提取出第一层更新路径即可
  if (!createOptions.exact) {
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
  const { deep, rules } = createOptions;
  const writeKey2Ids: Record<string, string[]> = {};
  const isDeep = canUseDeep(deep);

  rules.forEach(rule => {
    const writeKeys: string[] = [];
    let state: any;
    if (isDeep) {
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
function interveneDeps(opts: { internal: TInternal, depKeys: string[], fn?: Fn, add: boolean }) {
  const { depKeys, fn, add, internal } = opts;
  if (isFn(fn)) {
    const { rawState, sharedKey, createOptions } = internal;
    const { deep } = createOptions;
    const isDeep = canUseDeep(deep);
    let state: any;
    const record = (keyPath: string[]) => {
      const depKey = getDepKeyByPath(keyPath, sharedKey);
      add ? nodupPush(depKeys, depKey) : delListItem(depKeys, depKey);
    };

    if (isDeep) {
      state = immut(rawState, {
        onOperate: ({ fullKeyPath }) => record(fullKeyPath),
        extraProps: { [SHARED_KEY]: sharedKey },
      });
    } else {
      state = createOb(
        rawState,
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

export function parseOptions(options?: ICreateOptionsType) {
  let enableReactive = false;
  let enableRecordDep = false;
  let copyObj = false;
  let enableSyncOriginal = true;
  let moduleName = '';
  let deep = true;
  let exact = true;
  let rules: ICreateOptions['rules'] = [];

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
    rules = options.rules ?? [];
  }

  return { enableReactive, enableRecordDep, copyObj, enableSyncOriginal, moduleName, deep, exact, rules };
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

function getHeluxParams(rawState: Dict, createOptions: ICreateOptionsFull): IHeluxParams {
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
  const { enableReactive, enableRecordDep, deep } = createOptions;
  const collectDep = (key: string) => {
    const depKey = prefixValKey(key, sharedKey);
    if (enableRecordDep) {
      recordDep(sharedKey, depKey);
    }
    // using shared state in derived/watch callback
    fnDep.recordValKeyDep(depKey, { sharedKey });
  };

  if (canUseDeep(deep)) {
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
    insCtxMap: Map<number, IInsCtx>,
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
    runInsUpdater(insCtxMap.get(insKey) as InsCtxDef, state);
  });
};

interface IHanldeStateCtx extends ISetStateOptions {
  state: Dict;
  internal: TInternal;
  depKeys: string[];
  ids: string[];
  triggerReasons: TriggerReason[];
}

function handleState(opts: IHanldeStateCtx) {
  const { state, depKeys, ids, triggerReasons, extraDeps, excludeDeps, internal } = opts;
  const { key2InsKeys, id2InsKeys, insCtxMap, rawState } = internal;
  Object.assign(rawState, state);
  if (internal.isDeep) { // now state is a structurally shared obj generated by limu
    internal.rawStateSnap = state;
  } else {
    if (internal.shouldSync) {
      Object.assign(rawState, state);
    }
    internal.rawStateSnap = { ...rawState };
  }
  interveneDeps({ internal, depKeys, add: true, fn: extraDeps });
  interveneDeps({ internal, depKeys, add: false, fn: excludeDeps });
  execDepFnAndInsUpdater(state, { internal, ids, depKeys, triggerReasons, key2InsKeys, id2InsKeys, insCtxMap });
}

interface IHandleDeepMutateOpts extends ISetStateOptions {
  internal: TInternal;
}

export function handleDeepMutate(opts: IHandleDeepMutateOpts) {
  const depKeys: string[] = [];
  const triggerReasons: TriggerReason[] = [];
  const ids: string[] = [];
  const handleOpts = { state: {}, depKeys, ids, triggerReasons, ...opts };
  const { internal } = opts;
  const { writeKey2Ids, rawState } = internal;

  const writeKeys: Dict = {};
  const writeKeyPathInfo: Dict<TriggerReason> = {};
  const draft = createDraft(rawState, {
    onOperate(opParams) {
      handleOperate(opParams, { internal, ids, writeKeys, writeKeyPathInfo, writeKey2Ids });
    },
  });

  return {
    draft,
    finishMutate(partial?: Dict) {
      handleOpts.depKeys = Object.keys(writeKeys);
      // 把深依赖和迁依赖收集到的keys合并起来
      if (isObj(partial)) {
        Object.keys(partial).forEach(key => {
          nodupPush(depKeys, key);
          draft[key] = partial[key];
        });
      }
      handleOpts.state = finishDraft(draft); // a structurally shared state generated by limu
      handleOpts.triggerReasons = Object.values(writeKeyPathInfo);
      handleState(handleOpts);

      return opts.internal.rawStateSnap;
    },
  };
}

interface IHandleNormalMutateOpts extends ISetStateOptions {
  internal: TInternal;
}

export function handleNormalMutate(opts: IHandleNormalMutateOpts) {
  const { internal } = opts;
  const { rawState, sharedKey, moduleName } = internal;
  const newPartial: Dict = {};
  const mayChangedKeys: string[] = [];
  const depKeys: string[] = [];
  const triggerReasons: TriggerReason[] = [];
  const ids: string[] = [];
  const handleOpts = { state: {}, depKeys, ids, triggerReasons, ...opts };

  // 为了和 deep 模式下返回的 setState 保持行为一致
  const mockDraft = createOb(
    rawState,
    {
      set: (target: Dict, key: any, val: any) => {
        newPartial[key] = val;
        return true;
      },
      get: (target: Dict, key: any) => {
        mayChangedKeys.push(key);
        const val = newPartial[key];
        return val !== undefined ? val : target[key];
      },
    },
  );

  return {
    draft: mockDraft,
    finishMutate(partial?: Dict) {
      /**
       * 兼容非 deepShared 模式下用户的以下代码
       * ```txt
       * setState(state=>({a: state.a + 1}));
       * setState(state=>(state.a = state.a + 1));
       * setState(state=>{state.a = state.a + 1; return { b: state.a + 1 }});
       * ```
       */
      Object.assign(newPartial, partial);
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
        newPartial[key] = rawState[key];
      });

      Object.keys(newPartial).forEach((key) => {
        const depKey = prefixValKey(key, sharedKey);
        depKeys.push(depKey);
        triggerReasons.push({ sharedKey, moduleName, keyPath: [depKey] });
      });
      handleOpts.state = newPartial;
      handleState(handleOpts);

      return internal.rawStateSnap;
    },
  }
}

function bindInternalToShared(sharedState: Dict, heluxParams: IHeluxParams) {
  const { createOptions } = heluxParams;
  const { deep } = createOptions;
  const insCtxMap = new Map<number, InsCtxDef>();
  const key2InsKeys: Record<string, number[]> = {};
  // id --> insKeys 
  const id2InsKeys: Record<string, number[]> = {};
  const writeKey2Ids = parseRules(heluxParams);
  const isDeep = canUseDeep(deep);

  const internal = buildInternal(heluxParams, {
    /** setState implementation */
    setState: (partialState: Dict | ((rawStateOrDraft: Dict) => Dict), options: ISetStateOptions = {}) => {
      // do nothing
      if (partialState === internal.rawStateSnap) {
        return partialState;
      }

      let ctx;
      let returnedPartial;
      // deep 模式修改： setState(draft=>{draft.x.y=1})
      if (isFn(partialState) && isDeep) {
        // now partialState is a draft recipe callback
        ctx = handleDeepMutate({ internal, ...options });
        // returnedPartial 是为了对齐非deep模式的 setState，这个只支持一层依赖收集
        returnedPartial = partialState(ctx.draft);
      } else {
        ctx = handleNormalMutate({ internal });
        returnedPartial = isFn(partialState) ? partialState(ctx.draft) : partialState;
      }

      return ctx.finishMutate(returnedPartial);
    },
    insCtxMap,
    key2InsKeys,
    id2InsKeys,
    writeKey2Ids,
    isDeep,
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

export function buildSharedObject<T extends Dict = Dict>(stateOrStateFn: T | (() => T), options: ICreateOptionsFull): [T, Fn] {
  const rawState = parseRawState(stateOrStateFn);
  const heluxParams = getHeluxParams(rawState, options);
  const sharedState = buildSharedState(heluxParams);
  clearInternal(options.moduleName);
  bindInternalToShared(sharedState, heluxParams);
  record(options.moduleName, sharedState);
  fnDep.markExpired();

  return [sharedState, getInternal(sharedState).setState];
}
