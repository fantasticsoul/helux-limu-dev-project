import { VER } from '../consts';
import type { Dict, Fn, IBlockCtx, IFnCtx, IPlugin, IUnmountInfo, Middleware, NumStrSymbol, SharedState } from '../types';
import { asType, GLOBAL_REF, safeGet } from '../utils';
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

function buildEventBus() {
  const name2cbs: Dict<Fn[]> = {};
  return {
    on: (name: string, cb: Fn) => {
      const cbs = safeGet(name2cbs, name, [] as Fn[]);
      cbs.push(cb);
    },
    emit: (name: string, ...args: any[]) => {
      const cbs = name2cbs[name] || [];
      cbs.slice().forEach((cb) => cb(...args));
    },
    /** for perf */
    canEmit: (name: string) => name2cbs[name],
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
      bus: buildEventBus(),
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

let CTX_KEY: NumStrSymbol = '';

/** make sure initHeluxRoot been called */
export function getHeluxRoot(): HeluxRoot {
  return GLOBAL_REF[CTX_KEY];
}

export function initHeluxRoot(options: {
  heluxCtxKey: string | symbol;
  standalone?: boolean;
  transfer?: (existedRoot: any, newRoot: any) => any;
}) {
  const { heluxCtxKey, standalone, transfer } = options;
  const existedRoot: HeluxRoot = GLOBAL_REF[heluxCtxKey];
  CTX_KEY = heluxCtxKey;
  if (!existedRoot) {
    GLOBAL_REF[CTX_KEY] = createRoot();
    return;
  }

  // found another version, but want to own dependency helux context
  if (standalone) {
    CTX_KEY = `${String(heluxCtxKey)}_${Date.now()}`;
    GLOBAL_REF[CTX_KEY] = createRoot();
    return;
  }

  // now current helux will reuse existed helux context,
  // multi helux lib will share one hulex context,
  // no matter the helux in app1 and and2 is the same module or not,
  // it is ok that app1 can use a shared state exported from app2 by useShared directly,

  //try transfer legacy root by user custom transfer fn
  if (transfer) {
    const newRoot = createRoot(); // may a lower version root
    transfer(existedRoot, newRoot);
  }
}
