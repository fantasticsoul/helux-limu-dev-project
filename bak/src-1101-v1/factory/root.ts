import { VER } from '../consts';
import type { Dict, IFnCtx, IUnmountInfo, IBlockCtx, NumStrSymbol, SharedState, Middleware, IPlugin } from '../types';
import { asType, GLOBAL_REF } from '../utils';
import type { TInternal } from './creator/buildInternal';

function buildFnScope() {
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
    /** 记录第一次运行的各个函数，辅助推导出计算状态 */
    DEPKEY_COMPUTING_FNKEYS_MAP: new Map<string, string[]>(),
  };
}

function buildBlockScope() {
  return {
    keySeed: 0, // for block key
    keyPrefix: 0,
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
    /** blockKey to IBlockCtx */
    KEY_CTX_MAP: new Map<string, IBlockCtx>(),
    KEY_DYNAMIC_CTX_MAP: new Map<string, IBlockCtx>(),
  };
}

function buildInsScope() {
  return {
    keySeed: 0, // for insKey
    UNMOUNT_INFO_MAP: new Map<number, IUnmountInfo>(),
  };
}

function buildSharedScope() {
  return {
    keySeed: 0, // for sharedKey
    SHARED_KEY_STATE_MAP: new Map<number, Dict>(),
    STATE_SHARED_KEY_MAP: new Map<any, number>(),
    /** key: been watched shared state, value: by these shared states */
    BEENING_WATCHED_MAP: new Map<SharedState, SharedState[]>(),
    /** sharedKey to internal */
    INTERMAL_MAP: new Map<number, TInternal>(),
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
      middlewares: [] as Middleware[],
      plugins: [] as IPlugin[],
      sharedScope: buildSharedScope(),
      fnScope: buildFnScope(),
      insScope: buildInsScope(),
      blockScope: buildBlockScope(),
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
