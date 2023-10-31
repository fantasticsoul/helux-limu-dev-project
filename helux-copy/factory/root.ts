import { VER } from '../consts';
import type { Dict, IFnCtx, IUnmountInfo, IBlockCtx, NumStrSymbol, SharedState } from '../types';
import { asType, GLOBAL_REF } from '../utils';
import type { TInternal } from './common/buildInternal';

function buildFnDep() {
  return {
    keySeed: {
      static: 0,
      hook: 0,
    },
    runningFnKey: '',
    /**
     * 避免 share 接口的 mutate 函数里收集到自己对自己的依赖，从而造成无限死循环
     */
    runningSharedState: null as any,
    /** globalId to Array<insKey> */
    GID_INSKEYS_MAP: new Map<NumStrSymbol, number[]>(),
    FNKEY_STATIC_CTX_MAP: new Map<string, IFnCtx>(),
    FNKEY_HOOK_CTX_MAP: new Map<string, IFnCtx>(),
    DEPKEY_FNKEYS_MAP: new Map<string, string[]>(),
    UNMOUNT_INFO_MAP: new Map<string, IUnmountInfo>(),
    /** 记录第一次运行的各个函数 */
    DEPKEY_RUNNING_FNKEYS_MAP: new Map<string, string[]>(),
  };
}

function buildBlockDep() {
  return {
    initCount: 0,
    mountedCount: 0,
    latest: {
      val: null,
      stateOrResult: null,
      depKey: '',
      keyPath: [] as string[],
      isDerivedResult: false,
      isDerivedAtom: false,
    },
    runningKey: '',
    /** sharedState to depKeys */
    runningDepMap: new Map<any, string[]>(),
    isDynamic: false,
    keySeed: 0,
    keyPrefix: 0,
    /** blockKey to IBlockCtx */
    KEY_CTX_MAP: new Map<string, IBlockCtx>(),
    KEY_DYNAMIC_CTX_MAP: new Map<string, IBlockCtx>(),
  };
}

function buildInsDep() {
  return {
    keySeed: 0,
    UNMOUNT_INFO_MAP: new Map<number, IUnmountInfo>(),
  };
}

function buildShared() {
  return {
    keySeed: 0,
    UNMOUNT_INFO_MAP: new Map<number, IUnmountInfo>(),
    SHARED_KEY_STATE_MAP: new Map<number, Dict>(),
    STATE_SHARED_KEY_MAP: new Map<any, number>(),
    /** key: been watched shared state, value: by these shared states */
    BEENING_WATCHED_MAP: new Map<SharedState, SharedState[]>(),
    /** sharedKey to internal */
    INTERMAL_MAP: {} as Dict<TInternal>,
  };
}

function createRoot() {
  const root = {
    VER,
    rootState: {} as Dict,
    setState: (moduleName: string, partialState: Dict) => {
      const modData = root.help.mod[moduleName];
      if (!modData) {
        throw new Error(`moduleName ${moduleName} not found`);
      }
      modData.setState(partialState);
    },
    help: {
      mod: {} as Dict, // 与模块相关的辅助信息
      sharedScope: buildShared(),
      fnDepScope: buildFnDep(),
      insDepScope: buildInsDep(),
      blockDepScope: buildBlockDep(),
      markAtomMap: new Map<any, boolean>(), // 不支持 symbol 的环境才会记录此map
      renderSN: 0, // 渲染批次序列号种子数
    },
    globalShared: asType<Dict>(null), // works for useGlobalId
    globalInternal: asType<TInternal>(null), // works for useGlobalId
    legacyRoot: {},
  };
  return root;
}
type HeluxRoot = ReturnType<typeof createRoot>;

export function getHelp() {
  return getHeluxRoot().help;
}

export function getMarkAtomMap() {
  const map = getHelp().markAtomMap;
  return map;
}

export function getHeluxRoot(): HeluxRoot {
  return GLOBAL_REF.__HELUX__;
}

export function ensureHeluxRoot() {
  const root: HeluxRoot = GLOBAL_REF.__HELUX__;
  if (!root) {
    GLOBAL_REF.__HELUX__ = createRoot();
    return;
  }

  // try transfer legacy
  const v = root.VER[0];
  if (v === '2' || v === '1') {
    const newRoot = createRoot();
    newRoot.legacyRoot = root;
    GLOBAL_REF.__HELUX__ = newRoot;
  }
}

ensureHeluxRoot();