import { getGlobalShared, setGlobalShared } from '../factory/common/globalId';
import { createSharedLogic } from '../factory/createShared';
import { NumStrSymbol } from '../types';
import { useSharedSimpleLogic } from './common/useSharedLogic';

let GLOBAL_SHARED_STATE: any = null;

export function getGlobalSharedState() {
  return GLOBAL_SHARED_STATE || initGlobalShared();
}

function initGlobalShared() {
  let shared = getGlobalShared();
  if (!shared) {
    // global shared state
    const { state } = createSharedLogic({ rawState: {}, forGlobal: true });
    setGlobalShared(state);
    shared = state;
  }
  GLOBAL_SHARED_STATE = shared;
  return shared;
}

export function useGlobalId(globalId: NumStrSymbol) {
  const globalSharedState = getGlobalSharedState();
  const insCtx = useSharedSimpleLogic(globalSharedState, { staticDeps: () => [], globalId });
  return insCtx.renderInfo;
}
