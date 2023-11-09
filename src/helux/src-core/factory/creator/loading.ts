import type { Dict, Fn, LoadingState, IRenderInfo, LoadingStatus } from '../../types';
import { getInternal } from '../../helpers/state';
import { createOb } from '../../helpers/obj';
import { getRootCtx } from '../root';
import { noop } from '../../utils';
import { HELUX_GLOBAL_LOADING, STATE_TYPE, LOADING_MODE } from '../../consts';
import type { TInternal } from './buildInternal';
import { useSharedLogic } from '../../hooks/common/useSharedLogic';

const { GLOGAL_LOADING, PRIVATE_LOADING } = STATE_TYPE;
const { PRIVATE, GLOBAL, NONE } = LOADING_MODE;
const fakeExtra: Dict = {};
const fakeLoading: Dict = {};
const fakeRenderInfo: IRenderInfo = { sn: 0, getDeps: noop };

// will init after calling ensureGlobal at createShared
let GLOBAL_LOADING: any = null;

export function getGlobalLoading() {
  return GLOBAL_LOADING;
}

export function getGlobalLoadingInternal() {
  return getRootCtx().globalLoadingInternal;
}

export function initGlobalLoading(createFn: Fn) {
  const ctx = getRootCtx();
  let shared = ctx.globalLoading;
  if (!shared) {
    const { state } = createFn({ rawState: {}, stateType: GLOGAL_LOADING }, { moduleName: HELUX_GLOBAL_LOADING });
    const internal = getInternal(state);
    ctx.globalLoadingInternal = internal;
    ctx.globalLoading = state;
  }
  GLOBAL_LOADING = shared;
  return shared;
}

/**
 * 为 shared 或 atom 创建独立的伴生 loading 状态
 * 通过分析 mutateFns 对象，为宿主对象创建一个伴生对象，专注于存储各种 desc 调用对应的 loading 状态
 */
export function createLoading(createFn: Fn, leaderInternal: TInternal) {
  const { mutateFns, moduleName } = leaderInternal;
  const rawLoading: LoadingState = {};
  mutateFns.forEach(item => {
    if (item.desc) {
      rawLoading[item.desc] = { loading: false, err: null, ok: true };
    }
  });
  const name = moduleName ? `${moduleName}@Loading` : '';
  const loadingCtx = createFn({ rawState: rawLoading, isLoading: true, stateType: PRIVATE_LOADING }, { moduleName: name });
  return loadingCtx.state;
}

export function setLaadStatus(interal: TInternal, desc: string, status: LoadingStatus) {
  if (!desc) return;
  const { loadingInternal } = interal;
  loadingInternal.setState((draft: any) => draft[desc] = status);
}

/**
 * 因 loading 的特殊性（类型里标记了 Ext 扩展），支持用户按字符串查询 loading 并确保不出错，
 * 创建一个 loading 代理对象，如获取不到真实的数据，则返回一个假的，
 * 确保让 loading 的任意获取都是安全的，不会出现 undefined
 */
export function getSafeLoading(extra: Dict, loading: any) {
  let safeLoading = extra.safeLoading;
  if (!safeLoading) { // 最多只创建一次
    safeLoading = createOb(loading, {
      get(target, key) {
        return target[key] || { loading: false, ok: true, err: null };
      }
    });
    extra.safeLoading = safeLoading;
  }
  return safeLoading;
}

/**
 * 初始化伴生的 loading 上下文
 */
export function initLoadingCtx(createFn: Fn, internal: TInternal) {
  const { stateType, loadingMode } = internal;
  let sharedLoading: any = getSafeLoading(fakeExtra, {});
  let mayLoading = {};
  // 仅用户自己创建的状态才需要创建伴生的 loading 对象
  if (STATE_TYPE.USER_STATE === stateType) {
    if (PRIVATE === loadingMode) {
      mayLoading = createLoading(createFn, internal);
      sharedLoading = getSafeLoading(internal.extra, sharedLoading);
      // 向宿主上写入私有的 loadingInternal 实现
      internal.loadingInternal = getInternal(mayLoading);
    } else if (GLOBAL === loadingMode) {
      mayLoading = getGlobalLoading();
      const globalLoadingInternal = getGlobalLoadingInternal();
      sharedLoading = getSafeLoading(globalLoadingInternal.extra, sharedLoading);
      // 向宿主上挂上全局的 globalLoadingInternal 实现
      internal.loadingInternal = globalLoadingInternal;
    }
  }

  let useLoading = () => [getSafeLoading(fakeExtra, fakeLoading), noop, fakeRenderInfo];
  if (NONE !== loadingMode) {
    useLoading = () => {
      // 注意此处用实例的 extra 记录safaLoading
      const { proxyState, internal, extra, renderInfo } = useSharedLogic(mayLoading);
      return [getSafeLoading(extra, proxyState), internal.setState, renderInfo];
    };
  }

  return { sharedLoading, useLoading };
}
