import { createDraft, finishDraft, immut } from 'limu';
import { KEY_SPLITER, SHARED_KEY } from '../consts';
import * as fnDep from '../helpers/fndep';
import { runInsUpdater } from '../helpers/ins';
import { createHeluxObj, createOb, injectHeluxProto } from '../helpers/obj';
import { bindInternal, getInternal, getSharedKey, mapSharedState, markSharedKey, record } from '../helpers/state';
import type {
  Dict, DictN, EenableReactive, Fn, ICreateOptions,
  IHeluxParams, InnerCreateOptions, ModuleName, TriggerReason,
} from '../types';
import { dedupList, isFn, isObj, isSymbol, nodupPush, prefixValKey, safeGet, warn } from '../utils';
import { buildInternal, InsCtxDef } from './common/buildInternal';

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
  if (typeof stateOrStateFn === 'function') {
    // @ts-ignore
    rawState = stateOrStateFn();
  }
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('ERR_NON_OBJ: pass an non-object to createShared!');
  }
  if (getSharedKey(rawState)) {
    throw new Error('ERR_ALREADY_SHARED: pass a shared object to createShared!');
  }

  return rawState;
}

function getHeluxParams(rawState: Dict, createOptions: InnerCreateOptions): IHeluxParams {
  const { copyObj, enableSyncOriginal, moduleName } = createOptions;
  let heluxObj; // object marked shared key
  let shouldSync = false;
  if (copyObj) {
    shouldSync = enableSyncOriginal;
    heluxObj = createHeluxObj(rawState);
  } else {
    heluxObj = injectHeluxProto(rawState);
  }
  const sharedKey = markSharedKey(heluxObj);
  return { rawState, heluxObj, shouldSync, sharedKey, createOptions, moduleName: moduleName || `${sharedKey}` };
}

/**
 * 创建全局使用的共享对象，可提供给 useShared useComputed useWatch computed watch 函数使用
 */
function buildSharedState(heluxParams: IHeluxParams) {
  let sharedState: Dict = {};
  const { rawState, heluxObj, sharedKey, shouldSync, createOptions } = heluxParams;
  const { enableReactive, enableRecordDep, isDeep } = createOptions;
  const collectDep = (key: string) => {
    const depKey = prefixValKey(key, sharedKey);
    if (enableRecordDep) {
      recordDep(sharedKey, depKey);
    }
    // using shared state in computed/watch callback
    fnDep.recordValKeyDep(depKey, { sharedKey });
  };

  if (isDeep) {
    sharedState = immut(heluxObj, {
      onOperate: (params) => {
        collectDep(params.fullKeyPath.join(KEY_SPLITER));
      },
      extraProps: { [SHARED_KEY]: sharedKey },
    });
  } else {
    sharedState = createOb(
      heluxObj,
      // setter
      (target: Dict, key: any, val: any) => {
        if (enableReactive) {
          heluxObj[key] = val;
          if (shouldSync) {
            rawState[key] = val;
          }
          getInternal(heluxObj).setState({ [key]: val });
        } else {
          warn('changing shared state is invalid');
        }
        return true;
      },
      // getter
      (target: Dict, key: any) => {
        if (isSymbol(key)) {
          return target[key];
        }
        collectDep(key);
        return target[key];
      },
    );
  }
  mapSharedState(sharedKey, sharedState);

  return sharedState;
}

function bindInternalToShared(sharedState: Dict, heluxParams: IHeluxParams) {
  const { heluxObj, rawState, shouldSync, sharedKey, createOptions, moduleName } = heluxParams;
  const { isDeep } = createOptions;
  const insCtxMap = new Map<number, InsCtxDef>();
  // VALKEY_INSKEYS_MAP
  const key2InsKeys: Record<string, number[]> = {};

  const execDepFnAndInsUpdater = (state: Dict, depKeys: string[], triggerReasons: TriggerReason[]) => {
    internal.ver += 1;
    // find associate ins keys
    let allInsKeys: number[] = [];
    // find associate computed/watch fn ctxs
    let allFirstLevelFnKeys: string[] = [];
    let allAsyncFnKeys: string[] = [];
    const runCountStats: Dict<number> = {};

    depKeys.forEach((key) => {
      allInsKeys = allInsKeys.concat(key2InsKeys[key] || []);
      const { firstLevelFnKeys, asyncFnKeys } = fnDep.getDepFnStats(key, runCountStats);
      allFirstLevelFnKeys = allFirstLevelFnKeys.concat(firstLevelFnKeys);
      allAsyncFnKeys = allAsyncFnKeys.concat(asyncFnKeys);
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

  const internal = buildInternal(heluxParams, {
    /** setState implementation */
    setState: (partialState: Dict | ((rawStateOrDraft: Dict) => Dict)) => {
      // do nothing
      if (partialState === internal.rawStateSnap) {
        return partialState;
      }
      let depKeys: string[] = [];
      let triggerReasons: TriggerReason[] = [];

      const handleState = (state: Dict) => {
        Object.assign(heluxObj, state);
        if (isDeep) { // now state is a structurally shared obj generated by limu
          internal.rawStateSnap = state;
        } else {
          if (shouldSync) {
            Object.assign(rawState, state);
          }
          internal.rawStateSnap = { ...heluxObj };
        }
        execDepFnAndInsUpdater(state, depKeys, triggerReasons);
      };

      // deep 模式修改： setState(draft=>{draft.x.y=1})
      if (isFn(partialState) && isDeep) {
        const writeKeys: Dict = {};
        const writeKeyPath: Dict<TriggerReason> = {};
        const draft = createDraft(heluxObj, {
          onOperate(opParams) {
            const { isChange, fullKeyPath } = opParams;
            if (!isChange) return;

            const initialKey = prefixValKey('', sharedKey);
            fullKeyPath.reduce((acc, next, idx) => {
              const spliter = idx === 0 ? '' : KEY_SPLITER;
              const key = `${acc}${spliter}${next}`;
              writeKeys[key] = 1;
              return key;
            }, initialKey);
            const curWriteKey = prefixValKey(fullKeyPath.join(KEY_SPLITER), sharedKey);
            writeKeyPath[curWriteKey] = { sharedKey, moduleName, keyPath: fullKeyPath };
          },
        });

        // returnedPartial 是为了对齐非deep模式的 setState，这个只支持一层依赖收集
        const returnedPartial = partialState(draft); // now partialState is a draft recipe callback
        const nextState = finishDraft(draft); // a structurally shared state generated by limu
        depKeys = Object.keys(writeKeys);
        // 把深依赖和迁依赖收集到的keys合并起来
        if (isObj(returnedPartial)) {
          depKeys = depKeys.concat(Object.keys(returnedPartial));
        }

        triggerReasons = Object.keys(writeKeyPath).map(key => writeKeyPath[key]);
        handleState(nextState);

        return nextState;
      }

      const newPartial: Dict = {};
      const returnedPartial = isFn(partialState)
        ? partialState(
          createOb(
            heluxObj,
            // 为了和 createDeepShared 返回的 setState 保持行为一致
            (target: Dict, key: any, val: any) => {
              newPartial[key] = val;
              return true;
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
      Object.keys(newPartial || {}).forEach((key) => {
        const depKey = prefixValKey(key, sharedKey);
        depKeys.push(depKey);
        triggerReasons.push({ sharedKey, moduleName, keyPath: [depKey] });
      });
      handleState(newPartial);
      return heluxObj;
    },
    insCtxMap,
    key2InsKeys,
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
