import { getHelp } from '../root';

const { blockScope } = getHelp();
const { KEY_CTX_MAP, KEY_DYNAMIC_CTX_MAP } = blockScope;

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
  blockScope.latest = { val, stateOrResult: sharedState, depKey, keyPath, isDerivedResult, isDerivedAtom };
}

/**
 * 获取最新的数据读取信息
 */
export function getLastest() {
  return blockScope.latest;
}

export function getBlockCtxMap(isDynamic: boolean) {
  const map = isDynamic ? KEY_DYNAMIC_CTX_MAP : KEY_CTX_MAP;
  return map;
}
