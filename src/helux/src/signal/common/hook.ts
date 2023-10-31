import { useEffect, useRef } from 'react';
import { isDerivedAtom } from '../../factory/common/atom';
import { delBlockCtx, markBlockMounted } from '../../helpers/blockCtx';
import { isSharedState } from '../../helpers/state';
import { useSharedSimpleLogic } from '../../hooks/common/useSharedLogic';
import { useDerivedSimpleLogic } from '../../hooks/common/useDerivedLogic';
import type { IBlockCtx } from '../../types';

export function useDep(blockCtx: IBlockCtx, showProcess = false) {
  let isComputing = false;
  console.log('blockCtx.map.size ', blockCtx.map.size);

  blockCtx.map.forEach((depKeys, stateOrResult) => {
    // trust beblow statement, cause map length is stable
    if (isSharedState(stateOrResult)) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const insCtx = useSharedSimpleLogic(stateOrResult);
      if (insCtx.isFirstRender) {
        // transfer depKeys
        depKeys.forEach(depKey => insCtx.recordDep(depKey, true));
      }
      insCtx.isFirstRender = false;
    } else {
      // will transfer depKeys in genDerivedResult process
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const fnCtx = useDerivedSimpleLogic({ fn: stateOrResult, forAtom: isDerivedAtom(stateOrResult), showProcess });
      fnCtx.isReadedOnce = true; // mark readed
      isComputing = fnCtx.isComputing || isComputing;
    }
  });
  return isComputing;
}

export function useDelBlockCtxEffect(blockCtx: IBlockCtx, isDynamic: boolean) {
  useEffect(() => {
    if (!blockCtx.mounted) {
      markBlockMounted(blockCtx);
    }
    return () => delBlockCtx(blockCtx.key, isDynamic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockCtx]);
}

export function useIsFirstRender(blockCtx: IBlockCtx, isDynamic: boolean) {
  const ref = useRef({ isFirst: true, key: blockCtx.key });
  if (ref.current.key !== blockCtx.key) { // works for hot reload
    delBlockCtx(ref.current.key, isDynamic);
    ref.current.isFirst = true;
    ref.current.key = blockCtx.key;
  }
  return ref;
}
