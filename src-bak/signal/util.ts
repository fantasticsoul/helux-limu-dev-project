import { FunctionComponent, memo } from 'react';
import { useSharedSimpleLogic } from '../hooks/common/useSharedLogic';
import { useDerivedSimpleLogic } from '../hooks/common/useDerivedLogic';
import { getVal } from '../utils';
import type { Fn, Dict, DerivedAtom } from '../types';

export const alwaysEqual = () => true;

interface IWrapSignalComp {
  sharedState: Dict;
  depKey: string;
  keyPath: string[];
  compare?: Fn;
}

/** for perf, no options here */
export function wrapComp(Comp: any, displayName: string, needMemo?: boolean, compare?: Fn): FunctionComponent {
  const CompVar = Comp as FunctionComponent;
  CompVar.displayName = displayName;
  return needMemo ? memo(CompVar, compare) : CompVar;
}

/**
 * for perf, no options arg here
 */
export function wrapSignalComp(options: IWrapSignalComp): FunctionComponent {
  const { sharedState, depKey, keyPath, compare } = options;
  const Comp = function () {
    const insCtx = useSharedSimpleLogic(sharedState);
    insCtx.recordDep(depKey, true);
    return getVal(sharedState, keyPath);
  } as FunctionComponent;
  return wrapComp(Comp, 'HeluxPrimitiveSignal', true, compare);
}

export function wrapDerivedAtomSignalComp(derivedAtom: DerivedAtom, compare?: Fn): FunctionComponent {
  const Comp = function () {
    const fnCtx = useDerivedSimpleLogic({ fn: derivedAtom, forAtom: true });
    fnCtx.isReadedOnce = true; // mark readed
    return fnCtx.proxyResult.val as any; // auto unbox atom result
  } as any;
  return wrapComp(Comp, 'HeluxDerivedAtomSignal', true, compare);
}

export function wrapDerivedSignalComp(derivedResult: DerivedAtom, keyPath: string[], compare?: Fn) {
  const Comp = function () {
    const fnCtx = useDerivedSimpleLogic({ fn: derivedResult, forAtom: false });
    fnCtx.isReadedOnce = true; // mark readed
    return getVal(derivedResult, keyPath);
  }
  return wrapComp(Comp, 'HeluxDerivedSignal', true, compare);
}
