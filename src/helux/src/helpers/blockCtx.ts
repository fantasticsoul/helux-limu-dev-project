import { getHelp } from '../factory/root';
import { genBlockKey } from '../factory/common/key';
import { getBlockCtxMap } from '../factory/common/blockScope';
import { IBlockCtx, SharedState } from '../types';

const { blockScope } = getHelp();
const SIZE_LIMIT = 100;
const EXPIRE_LIMIT = 5000; // ms

function newBlockCtx(key: string): IBlockCtx {
  return {
    key,
    map: new Map(),
    collected: false,
    mounted: false,
    renderAtomOnce: false,
    time: 0,
  }
}

/**
 * 为 block 函数初始一个执行上下文
 */
export function initBlockCtx(isDynamic: boolean) {
  if (isDynamic) {
    blockScope.initCount += 1;
  }
  const blockKey = genBlockKey();
  const blockCtx = newBlockCtx(blockKey);
  getBlockCtxMap(isDynamic).set(blockKey, blockCtx);
  return blockCtx;
}

export function markBlockMounted(blockCtx: IBlockCtx) {
  blockCtx.mounted = true;
  blockCtx.time = Date.now();
  blockScope.mountedCount += 1;
}

/**
 * 删除 block 函数对应上下文
 */
export function delBlockCtx(blockBey: string, isDynamic: boolean) {
  const map = getBlockCtxMap(isDynamic);
  map.delete(blockBey);

  // work for strict mode
  if (isDynamic && map.size === SIZE_LIMIT && blockScope.initCount - blockScope.mountedCount > 2) {
    blockScope.initCount = 0;
    blockScope.mountedCount = 0;
    const now = Date.now();
    map.forEach((item, key) => {
      if (!item.mounted && now - item.time > EXPIRE_LIMIT) {
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        // deleting item in map.forEach is doable
        map.delete(key);
      }
    });
  }
}

/**
 * 标记某个 block 函数开始执行
 */
export function startBlockFn(blockCtx: IBlockCtx, isDynamic: boolean) {
  blockScope.runningKey = blockCtx.key;
  blockScope.isDynamic = isDynamic;
}

/**
 * 标记某个 block 函数执行结束
 */
export function endBlockFn(blockCtx: IBlockCtx) {
  blockScope.runningKey = ''; // let all execution context konw block fn is end status
  blockScope.isDynamic = false;
  const { runningDepMap: runingDepMap } = blockScope;
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
