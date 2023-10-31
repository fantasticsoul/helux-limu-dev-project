import { createElement, ForwardedRef, useEffect } from 'react';
import { getAtom, isDerivedAtom } from '../factory/common/scope';
import { startBlockFn, endBlockFn, initBlockCtx, delBlockCtx, markBlockMounted } from '../helpers/blockdep';
import { isSharedState } from '../helpers/state';
import { useSharedSimpleLogic } from '../hooks/common/useSharedLogic';
import { useDerivedSimpleLogic } from '../hooks/common/useDerivedLogic';
import { wrapComp, wrapDerivedAtomSignalComp } from './util';
import type { Fn, Dict, BlockCb, IBlockCtx, IBlockOptions } from '../types';

function callBlockCb(blockCtx: IBlockCtx, isDynamic: boolean, cb: Fn, props: Dict, ref: ForwardedRef<any>) {
  if (!blockCtx.collected) {
    startBlockFn(blockCtx, isDynamic);
  }
  const result = cb(props, ref) || '';
  if (!blockCtx.collected) {
    endBlockFn(blockCtx);
  }
  return result;
}

function renderResult(blockCtx: IBlockCtx, result: any) {
  if (isDerivedAtom(result)) {
    const Comp = wrapDerivedAtomSignalComp(result);
    return createElement(Comp);
  }
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
      const fnCtx = useDerivedSimpleLogic({ fn: stateOrResult, forAtom: isDerivedAtom(stateOrResult) });
      fnCtx.isReadedOnce = true; // mark readed
    }
  });

  // 内部自动尝试拆箱 atom
  return getAtom(result as any);
}

function blockComp<P extends object = object>(blockCtx: IBlockCtx, defComp: Fn, options?: IBlockOptions<P>) {
  const { memo = true, compare } = options || {};
  const CompRender = defComp(blockCtx);
  return wrapComp(CompRender, 'HeluxBlock', memo, compare);
}

/**
 * 渲染过程中定义的组件，推荐使用 dynamicBlock 替代 block
 */
export function dynamicBlock<P extends object = object>(cb: BlockCb<P>, options?: IBlockOptions<P>) {
  const blockCtx = initBlockCtx(true);
  const Block = blockComp(blockCtx, () => {
    // user may wrap Comp with React.forwardRef
    return (props: any, ref: ForwardedRef<any>) => {
      const result = callBlockCb(blockCtx, true, cb, props, ref);
      useEffect(() => {
        if (!blockCtx.mounted) {
          markBlockMounted(blockCtx);
        }
        return () => delBlockCtx(blockCtx.key);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [blockCtx.key]);
      return renderResult(blockCtx, result);
    }
  }, options);
  return Block;
}

/**
 * 用户在组件里调用，推荐使用 dynamicBlock 替代 block
 * 如果非要在组件里使用view生成组件，也能正常动作，但会额外占用一些不会释放的内存
 */
export function block<P extends object = object>(cb: BlockCb<P>, options?: IBlockOptions<P>) {
  const blockCtx = initBlockCtx(false);
  const Block = blockComp(blockCtx, () => {
    // user may wrap Block with React.forwardRef
    return (props: any, ref: ForwardedRef<any>) => {
      const result = callBlockCb(blockCtx, false, cb, props, ref);
      return renderResult(blockCtx, result);
    }
  }, options);
  return Block;
}
