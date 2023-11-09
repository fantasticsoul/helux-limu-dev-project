import { immut } from 'limu';
import { EXPIRE_MS, IS_DERIVED_ATOM, KEY_SPLITER, NOT_MOUNT, RENDER_END, RENDER_START, WAY } from '../consts';
import { mapGlobalId } from '../factory/creator/globalId';
import { genInsKey } from '../factory/common/key';
import { recordDataKeyForStop } from '../factory/common/util';
import type { InsCtxDef } from '../factory/creator/buildInternal';
import type { Dict, Ext, IFnCtx, IUseSharedOptions } from '../types';
import { isFn, isSymbol, prefixValKey, warn } from '../utils';
import { recordBlockDepKey } from './blockDep';
import * as fnDep from './fnDep';
import { clearDep } from './insDep';
import { createOb } from './obj';
import { getInternal } from './state';

export function runInsUpdater(insCtx: InsCtxDef | undefined) {
  if (!insCtx) return;
  const { updater, mountStatus, createTime } = insCtx;
  if (mountStatus === NOT_MOUNT && Date.now() - createTime > EXPIRE_MS) {
    return clearDep(insCtx);
  }

  updater();
}

export function attachInsProxyState(insCtx: InsCtxDef) {
  const { way } = insCtx;
  const { rawState, isDeep } = insCtx.internal;

  const collectDep = (valKey: string) => {
    if (
      !insCtx.canCollect // 无需收集依赖
      || (way === WAY.FIRST_RENDER && !insCtx.isFirstRender) // 仅第一轮渲染收集依赖
    ) {
      return;
    }
    insCtx.recordDep(valKey);
  };

  if (isDeep) {
    insCtx.proxyState = immut(rawState, {
      onOperate: (params) => {
        if (!params.isBuiltInFnKey) {
          collectDep(params.fullKeyPath.join(KEY_SPLITER));
        }
      },
      compareVer: true,
    });
  } else {
    insCtx.proxyState = createOb(rawState, {
      set: () => {
        warn('changing shared state is invalid');
        return true;
      },
      get: (target: Dict, key: string) => {
        if (isSymbol(key)) {
          return target[key];
        }
        collectDep(key);
        return target[key];
      },
    });
  }
}

export function buildInsCtx(options: Ext<IUseSharedOptions>): InsCtxDef {
  const { updater, sharedState, id = '', globalId = '', staticDeps, way = WAY.EVERY_RENDER } = options;
  const internal = getInternal(sharedState);
  if (!internal) {
    throw new Error('ERR_OBJ_NOT_SHARED: input object is not a result returned by share api');
  }

  const insKey = genInsKey();
  const { rawState, isDeep, ver, sharedKey, ruleConf } = internal;
  const insCtx: InsCtxDef = {
    readMap: {},
    readMapPrev: {},
    readMapStrict: null,
    isDeep,
    insKey,
    internal,
    rawState,
    sharedState,
    proxyState: {},
    updater,
    mountStatus: NOT_MOUNT,
    renderStatus: RENDER_START,
    createTime: Date.now(),
    ver,
    id,
    globalId,
    way,
    canCollect: true,
    hasStaticDeps: false,
    isFirstRender: true,
    subscribe: (cb) => {
      // call insDep subscribe after snap changed
      cb();
    },
    /** 记录一些需复用的中间生成的数据 */
    extra: {},
    renderInfo: {
      sn: 0,
      getDeps: () => Object.keys(insCtx.readMap),
    },
    recordDep: (valOrDepKey: string, isDepKey?: boolean) => {
      // depKey 可能因为配置了 rules[]stopDep 的关系被改写
      let depKey = isDepKey ? valOrDepKey : prefixValKey(valOrDepKey, sharedKey);
      recordDataKeyForStop(depKey, ruleConf.stopDepInfo, (key) => {
        depKey = key;
      });
      recordBlockDepKey(sharedState, [depKey]);

      if (insCtx.readMap[depKey] !== 1) {
        insCtx.readMap[depKey] = 1;
        if (insCtx.renderStatus !== RENDER_END) {
          internal.recordDep(depKey, insCtx.insKey);
        }
        // record derive/watch dep
        fnDep.recordFnDepKeys([depKey], {});
      }
    },
  };
  globalId && mapGlobalId(globalId, insKey);
  attachInsProxyState(insCtx);
  internal.mapInsCtx(insCtx, insKey);
  internal.recordId(id, insKey);
  if (isFn(staticDeps)) {
    staticDeps(insCtx.proxyState);
    insCtx.canCollect = false; // 让后续的收集行为无效
    insCtx.hasStaticDeps = true;
  }
  return insCtx;
}

export function attachInsDerivedResult(fnCtx: IFnCtx) {
  const { result, forAtom } = fnCtx;

  // MARK: 此计算结果不具备依赖收集特性，如需要此特性可使用 share接口 的 watch 加 mutate 配置完成
  // LABEL: proxyResult
  fnCtx.proxyResult = createOb(result, {
    set: () => {
      warn('changing derived result is invalid');
      return false;
    },
    get: (target: Dict, resultKey: string) => {
      if (IS_DERIVED_ATOM === resultKey) {
        return forAtom;
      }
      if (RENDER_START === fnCtx.renderStatus) {
        fnDep.ensureFnDepData(fnCtx);
        fnCtx.isReaded = true;
        fnCtx.isReadedOnce = true;
      }
      return result[resultKey];
    },
  });
}
