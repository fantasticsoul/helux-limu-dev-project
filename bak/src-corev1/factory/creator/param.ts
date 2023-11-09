import { createHeluxObj, injectHeluxProto } from '../../helpers/obj';
import { markSharedKey } from '../../helpers/state';
import type { Dict, IHeluxParams, IInnerCreateOptions } from '../../types';

/**
 * 分析 createOptions，算出 helux 内部创建共享对象过程中需要的参数
 */
export function getHeluxParams(rawState: Dict, createOptions: IInnerCreateOptions): IHeluxParams {
  const { copyObj, enableSyncOriginal, moduleName } = createOptions;
  let markedState; // object marked shared key
  let shouldSync = false;
  if (copyObj) {
    shouldSync = enableSyncOriginal;
    markedState = createHeluxObj(rawState);
  } else {
    markedState = injectHeluxProto(rawState);
  }
  const sharedKey = markSharedKey(markedState);
  return { rawState, markedState, shouldSync, sharedKey, createOptions, moduleName: moduleName || `${sharedKey}` };
}
