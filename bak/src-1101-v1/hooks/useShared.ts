import type { Atom, Dict, IUseSharedOptions, IRenderInfo, SetAtom, SetState } from '../types';
import { useSharedLogic } from './common/useSharedLogic';

export function useShared<T extends Dict = Dict>(sharedState: T, options: IUseSharedOptions<T> = {}): [T, SetState<T>, IRenderInfo] {
  const insCtx = useSharedLogic(sharedState, options);
  const { proxyState, internal, renderInfo } = insCtx;
  return [proxyState, internal.setState, renderInfo];
}

export function useAtom<T extends any = any>(sharedState: Atom<T>, options: IUseSharedOptions<Atom<T>> = {}): [T, SetAtom<T>, IRenderInfo] {
  const insCtx = useSharedLogic(sharedState, { ...options, forAtom: true });
  const { proxyState, internal, renderInfo } = insCtx;
  return [proxyState.val, internal.setAtom, renderInfo];
}
