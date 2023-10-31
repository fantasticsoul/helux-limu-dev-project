import { getGlobalIdInsKeys, getGlobalInternal } from './globalId';
import { runFn, markComputing, getDepFnStats } from '../../helpers/fndep';
import { runInsUpdater } from '../../helpers/ins';
import { getWatchers } from '../../helpers/state';
import type { Dict, InsCtxMap } from '../../types';
import { dedupList } from '../../utils';
import type { InsCtxDef } from './buildInternal';
import { callWatcherMutate } from './mutateRule';
import { getRenderSN } from './scope';
import type { ICommitStateOptions } from './commitState';

export function execDepFnAndInsUpdater(opts: ICommitStateOptions) {
  const { mutateCtx, internal, sharedState } = opts;
  const { ids, globalIds, depKeys, triggerReasons } = mutateCtx;
  const { key2InsKeys, id2InsKeys, insCtxMap, sharedKey } = internal;

  internal.ver += 1;
  // find associate ins keys
  let allInsKeys: number[] = [];
  let globalInsKeys: number[] = [];
  // find associate derived/watch fn ctxs
  let allFirstLevelFnKeys: string[] = [];
  let allAsyncFnKeys: string[] = [];
  const runCountStats: Dict<number> = {};

  const analyzeDepKey = (key: string) => {
    allInsKeys = allInsKeys.concat(key2InsKeys[key] || []);
    const { firstLevelFnKeys, asyncFnKeys } = getDepFnStats(key, runCountStats);
    allFirstLevelFnKeys = allFirstLevelFnKeys.concat(firstLevelFnKeys);
    allAsyncFnKeys = allAsyncFnKeys.concat(asyncFnKeys);
  };
  depKeys.forEach(analyzeDepKey);
  // 直接设定 watchList 的 watch 函数，观察的共享对象本身的变化，这里以 sharedKey 为依赖去取查出来
  analyzeDepKey(`${sharedKey}`);
  // find id's ins keys
  ids.forEach((id) => {
    allInsKeys = allInsKeys.concat(id2InsKeys[id] || []);
  });
  // find globalId's ins keys, fn keys
  globalIds.forEach((id) => {
    getGlobalIdInsKeys(id).forEach((insKey) => globalInsKeys.push(insKey));
  });

  const sn = getRenderSN();
  // deduplicate
  allInsKeys = dedupList(allInsKeys);
  allFirstLevelFnKeys = dedupList(allFirstLevelFnKeys);
  allAsyncFnKeys = dedupList(allAsyncFnKeys);

  // start execute compute/watch fns
  allAsyncFnKeys.forEach((fnKey) => markComputing(fnKey, runCountStats[fnKey]));
  allFirstLevelFnKeys.forEach((fnKey) => runFn(fnKey, { sn, updateReasons: triggerReasons }));

  // start trigger watchers mutate cb
  const watchers = getWatchers(sharedState);
  if (watchers.length) {
    const { desc = null, prevDesc = null } = opts;
    // desc 继续透传下去，找到下一个修改函数
    watchers.forEach((watcherState) => callWatcherMutate(watcherState, desc, { prevDesc }));
  }

  const updateIns = (insCtxMap: InsCtxMap, insKey: number) => {
    const insCtx = insCtxMap.get(insKey) as InsCtxDef;
    if (insCtx) {
      insCtx.renderInfo.sn = sn;
      runInsUpdater(insCtx);
    }
  };
  // start update
  allInsKeys.forEach((insKey) => updateIns(insCtxMap, insKey));
  // start update globalId ins
  if (globalInsKeys.length) {
    const globalInsCtxMap = getGlobalInternal().insCtxMap;
    globalInsKeys.forEach((insKey) => updateIns(globalInsCtxMap, insKey));
  }
}
