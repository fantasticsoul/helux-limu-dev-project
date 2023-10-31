import { ReactNode, createElement } from 'react';
import { IS_BLOCK } from '../consts';
import { getSharedKey } from '../helpers/state';
import { isAtom, isDerivedAtom } from '../factory/common/atom';
import { getLastest } from '../factory/common/blockScope';
import { isFn, prefixValKey } from '../utils';
import { dynamicBlock } from './block';
import { wrapSignalComp, wrapDerivedSignalComp, wrapDerivedAtomSignalComp, alwaysEqual } from './common/wrap';
import type { SingalVal } from '../types';

export function signal(input: SingalVal | (() => SingalVal)): ReactNode {
  if (input && (input as any)[IS_BLOCK]) {
    return createElement(input as any);
  }

  // for $(()=>atom), $(()=>derivdedAtom), $(()=>ReactNode)
  if (isFn(input)) {
    const Comp = dynamicBlock(input, { compare: alwaysEqual });
    return createElement(Comp);
  }

  // for $(derivdedAtom)
  if (isDerivedAtom(input)) {
    const Comp = wrapDerivedAtomSignalComp(input, alwaysEqual);
    return createElement(Comp);
  }

  // for $(atom)
  if (isAtom(input)) {
    const sharedKey = getSharedKey(input);
    const options = { sharedState: input, depKey: prefixValKey('val', sharedKey), keyPath: ['val'], compare: alwaysEqual };
    const Comp = wrapSignalComp(options);
    return createElement(Comp);
  }

  const readedInfo = getLastest();
  const { val, stateOrResult, depKey, keyPath, isDerivedResult } = readedInfo;
  if (input === val && stateOrResult) {
    // for $(atomDerived.val), user unbox atomDerived manually
    if (readedInfo.isDerivedAtom) {
      const Comp = wrapDerivedAtomSignalComp(stateOrResult, alwaysEqual);
      return createElement(Comp);
    }

    // for $(derived.xxx)
    if (isDerivedResult) {
      const Comp = wrapDerivedSignalComp(stateOrResult, keyPath, alwaysEqual);
      return createElement(Comp);
    }

    // for $(atom.val) , $(shared.xxx)
    const Comp = wrapSignalComp({ sharedState: stateOrResult, depKey, keyPath, compare: alwaysEqual });
    return createElement(Comp);
  }

  return input;
}
