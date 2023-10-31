import { getHelp } from '../factory/root';
import { safeMapGet, nodupPush, ensureList } from '../utils';

const { blockScope } = getHelp();
const { KEY_CTX_MAP, KEY_DYNAMIC_CTX_MAP } = blockScope;

/**
 * 为可能存在的 block(cb) 的 cb 调用记录依赖
 */
export function recordBlockDepKey(stateOrResult: any, depKeyOrKeys: string | string[]) {
  const { runningKey } = blockScope;
  if (runningKey) {
    const { isDynamic } = blockScope;
    const map = isDynamic ? KEY_DYNAMIC_CTX_MAP : KEY_CTX_MAP;
    const blockCtx = map.get(runningKey);
    if (blockCtx) { // blockCtx is seted at initBlockCtx phase
      const depKeys = safeMapGet(blockCtx.map, stateOrResult, []);
      const keys = ensureList(depKeyOrKeys);
      keys.forEach((depKey) => nodupPush(depKeys, depKey));
    }
  }
}