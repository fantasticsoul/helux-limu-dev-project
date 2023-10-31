import { getHelp } from '../factory/root';
import { genBlockKey } from '../factory/common/scope';
import { safeMapGet, nodupPush, ensureList } from '../utils';
import { IBlockCtx, SharedState } from '../types';

const { blockDepScope } = getHelp();
const { KEY_CTX_MAP, KEY_DYNAMIC_CTX_MAP } = blockDepScope;
const SIZE_LIMIT = 100;
const EXPIRE_LIMIT = 5000; // ms

function newBlockCtx(key: string): IBlockCtx {
  return {
    key,
    map: new Map(),
    collected: false,
    mounted: false,
    time: 0,
  }
}

/**
 * for perf, no options param here
 * 记录共享状态或共享派生结果最近一次读取的数据，为 block 模块服务
 */
export function recordLastest(
  val: any,
  sharedState: any,
  depKey: string,
  keyPath: string[],
  isDerivedResult = false,
  isDerivedAtom = false,
) {
  blockDepScope.latest = { val, stateOrResult: sharedState, depKey, keyPath, isDerivedResult, isDerivedAtom };
}

/**
 * 获取最新的数据读取信息
 */
export function getLastest() {
  return blockDepScope.latest;
}

/**
 * 为 block 函数初始一个执行上下文
 */
export function initBlockCtx(isDynamic: boolean) {
  if (isDynamic) {
    blockDepScope.initCount += 1;
  }
  const blockKey = genBlockKey();
  const blockCtx = newBlockCtx(blockKey);
  const map = isDynamic ? KEY_DYNAMIC_CTX_MAP : KEY_CTX_MAP;
  map.set(blockKey, blockCtx);
  return blockCtx;
}

export function markBlockMounted(blockCtx: IBlockCtx) {
  blockCtx.mounted = true;
  blockCtx.time = Date.now();
  blockDepScope.mountedCount += 1;
}

/**
 * 删除 block 函数对应上下文
 */
export function delBlockCtx(blockBey: string) {
  KEY_DYNAMIC_CTX_MAP.delete(blockBey);
  // work for strict mode
  if (KEY_DYNAMIC_CTX_MAP.size === SIZE_LIMIT && blockDepScope.initCount - blockDepScope.mountedCount > 2) {
    blockDepScope.initCount = 0;
    blockDepScope.mountedCount = 0;
    const now = Date.now();
    KEY_DYNAMIC_CTX_MAP.forEach((item, key) => {
      if (!item.mounted && now - item.time > EXPIRE_LIMIT) {
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        // deleting item in map.forEach is doable
        KEY_DYNAMIC_CTX_MAP.delete(key);
      }
    });
  }
}

/**
 * 为可能存在的 block(cb) 的 cb 调用记录依赖
 */
export function recordBlockDepKey(stateOrResult: any, depKeyOrKeys: string | string[]) {
  const { runningKey } = blockDepScope;
  if (runningKey) {
    const { isDynamic } = blockDepScope;
    const map = isDynamic ? KEY_DYNAMIC_CTX_MAP : KEY_CTX_MAP;
    const blockCtx = map.get(runningKey);
    if (blockCtx) { // blockCtx is seted at initBlockCtx phase
      const depKeys = safeMapGet(blockCtx.map, stateOrResult, []);
      const keys = ensureList(depKeyOrKeys);
      keys.forEach((depKey) => nodupPush(depKeys, depKey));
    }
  }
}

/**
 * 标记某个 block 函数开始执行
 */
export function startBlockFn(blockCtx: IBlockCtx, isDynamic: boolean) {
  blockDepScope.runningKey = blockCtx.key;
  blockDepScope.isDynamic = isDynamic;
}

/**
 * 标记某个 block 函数执行结束
 */
export function endBlockFn(blockCtx: IBlockCtx) {
  blockDepScope.runningKey = ''; // let all execution context konw block fn is end status
  blockDepScope.isDynamic = false;
  const { runningDepMap: runingDepMap } = blockDepScope;
  blockCtx.collected = true;
  runingDepMap.forEach((depKeys, sharedState) => {
    blockCtx.map.set(sharedState, depKeys);
  });
  runingDepMap.clear();
}

/**
 * 读取 block 执行完毕收集到依赖状态
 */
export function getSharedState(blockCtx: IBlockCtx): IterableIterator<SharedState> {
  return blockCtx.map.keys();
}
