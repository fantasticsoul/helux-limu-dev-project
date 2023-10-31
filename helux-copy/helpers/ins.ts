import { immut } from 'limu';
import { EXPIRE_MS, KEY_SPLITER, NOT_MOUNT, RENDER_END, RENDER_START, WAY, IS_DERIVED_ATOM } from '../consts';
import type { InsCtxDef } from '../factory/common/buildInternal';
import { genInsKey } from '../factory/common/scope';
import { recordDataKeyForStop } from '../factory/common/util';
import { mapGlobalId } from '../factory/common/globalId';
import * as fnDep from '../helpers/fndep';
import { getInternal } from '../helpers/state';
import { recordBlockDepKey } from '../helpers/blockdep';
import type { Dict, Ext, IFnCtx, IUseSharedOptions } from '../types';
import { isFn, isSymbol, prefixValKey, warn } from '../utils';
import { clearDep } from './insdep';
import { createOb } from './obj';

export function runInsUpdater(insCtx: InsCtxDef | undefined) {
  if (!insCtx) return;
  const { updater, mountStatus, createTime } = insCtx;
  if (mountStatus === NOT_MOUNT && Date.now() - createTime > EXPIRE_MS) {
    return clearDep(insCtx);
  }

  updater();
}

export function attachInsProxyState(insCtx: InsCtxDef, enableReactive?: boolean) {
  const { internal, way } = insCtx;
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
      set: (target: Dict, key: string, val: any) => {
        // @ts-ignore
        target[key] = val;
        if (enableReactive) {
          internal.setState({ [key]: val });
        }
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
  const { updater, sharedState, enableReactive, id = '', globalId = '', staticDeps, way = WAY.EVERY_RENDER } = options;
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
    renderInfo: {
      sn: 0,
      getDeps: () => Object.keys(insCtx.readMap),
    },
    recordDep: (valOrDepKey: string, isDepKey?: boolean) => {
      // depKey 可能因为配置了 rules[]stopDep 的关系被改写
      let depKey = isDepKey ? valOrDepKey : prefixValKey(valOrDepKey, sharedKey);
      recordDataKeyForStop(depKey, ruleConf.stopDepInfo, (key) => { depKey = key });
      recordBlockDepKey(sharedState, depKey);

      if (insCtx.readMap[depKey] !== 1) {
        insCtx.readMap[depKey] = 1;
        if (insCtx.renderStatus !== RENDER_END) {
          internal.recordDep(depKey, insCtx.insKey);
        }
        // record derive/watch dep
        fnDep.recordFnDepKey(depKey, {});
      }
    },
  };
  globalId && mapGlobalId(globalId, insKey);
  attachInsProxyState(insCtx, enableReactive);
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
  fnCtx.proxyResult = createOb(result, {
    set: () => {
      warn('changing derived result is invalid');
      return false;
    },
    get: (target: Dict, resultKey: string) => {
      if (RENDER_START === fnCtx.renderStatus) {
        fnDep.ensureFnDepData(fnCtx);
        fnCtx.isReaded = true;
        fnCtx.isReadedOnce = true;
      }
      if (IS_DERIVED_ATOM === resultKey) {
        return forAtom;
      }
      return result[resultKey];
    },
  });
}
