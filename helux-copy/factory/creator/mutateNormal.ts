import { newMutateCtx, newOpParams } from './util';
import type { Dict, IInnerSetStateOptions, SharedState } from '../../types';
import { isObj, nodupPush, prefixValKey, has } from '../../utils';
import { createOb } from '../../helpers/obj';
import type { TInternal } from './buildInternal';
import { handleOperate } from './operateState'
import { commitState } from './commitState'


interface IHandleNormalMutateOpts extends IInnerSetStateOptions {
  internal: TInternal;
  forAtom: boolean;
  sharedState: SharedState;
}

/**
 * 非deep模式下，只是用Proxy或defineProperty生成一个仅代理一层的超过对象
 * 此时如果修改2层路径以上的值会修改原对象
 */
export function prepareNormalMutate(opts: IHandleNormalMutateOpts) {
  const { internal } = opts;
  const { rawState, sharedKey, moduleName } = internal;
  const newPartial: Dict = {};
  const mayChangedKeys: string[] = [];

  const mutateCtx = newMutateCtx(opts);
  const handleOpts = { state: {}, mutateCtx, ...opts };
  const handleValueChange = (key: string, value: any) => {
    handleOperate(newOpParams(key, value), { internal, mutateCtx });
  };

  // 为了和 deep 模式下返回的 setState 保持行为一致
  const mockDraft = createOb(rawState, {
    set: (target: Dict, key: any, value: any) => {
      newPartial[key] = value;
      handleValueChange(key, value);
      return true;
    },
    get: (target: Dict, key: any) => {
      const value = target[key];
      // 用户可能在非deep模式下直接修改深层次路径的值： state.a.b = 1
      // 但 get 只能拦截到第一层，故这记录到 mayChangedKeys 里
      if (isObj(value)) {
        mayChangedKeys.push(key);
      }
      return has(newPartial, key) ? newPartial[key] : target[key];
    },
  });

  return {
    draft: mockDraft,
    finishMutate(partial?: Dict, customOptions?: IInnerSetStateOptions) {
      /**
       * 兼容非 deep 模式下用户的以下代码
       * ```txt
       * setState(state=>({a: state.a + 1}));
       * setState(state=>(state.a = state.a + 1));
       * setState(state=>{state.a = state.a + 1; return { b: state.a + 1 }});
       * ```
       */
      if (isObj(partial)) {
        Object.assign(newPartial, partial);
        Object.keys(partial).forEach((key) => handleValueChange(key, partial[key]));
      }
      /**
       * 让非 deep 模式下用户的以下代码，能够推导出 a 发生了改变
       * ```txt
       * setState(state=>(state.a.b = 1));
       * ```
       * 注意此处可能发生误判，例如下面写法，会猜测为 state.a state.b 均发生了改变
       * 为了能够正确触发渲染而妥协允许存在冗余渲染，这是在浅收集模式下使用 mutable 修改状态没办法避免的事情
       * ```txt
       * setState(state=>(state.a.b = state.b.n + 1 ));
       * ```
       */
      mayChangedKeys.forEach((key) => {
        newPartial[key] = rawState[key];
        handleValueChange(key, newPartial[key]);
      });

      const { depKeys, triggerReasons } = mutateCtx;
      Object.keys(newPartial).forEach((key) => {
        const depKey = prefixValKey(key, sharedKey);
        nodupPush(depKeys, depKey);
        triggerReasons.push({ sharedKey, moduleName, keyPath: [depKey] });
      });
      handleOpts.state = newPartial;
      Object.assign(handleOpts, customOptions);
      commitState(handleOpts);

      return internal.rawStateSnap;
    },
  };
}