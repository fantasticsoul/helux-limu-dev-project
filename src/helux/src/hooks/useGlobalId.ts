import { createSharedLogic } from '../factory/createShared';
import { getGlobalShared, setGlobalShared } from '../factory/common/globalId';
import { NumStrSymbol } from '../types';
import { useSharedSimpleLogic } from './common/useSharedLogic';

export const GLOBAL_SHARED = ensureGlobalShared();

function ensureGlobalShared() {
  let shared = getGlobalShared();
  if (!shared) {
    // global shared state
    const { state } = createSharedLogic({ rawState: {}, forGlobal: true });
    setGlobalShared(state);
    shared = state;
  }
  return shared;
}

export function useGlobalId(globalId: NumStrSymbol) {
  const insCtx = useSharedSimpleLogic(GLOBAL_SHARED, { staticDeps: () => [], globalId });
  return insCtx.renderInfo;
}
