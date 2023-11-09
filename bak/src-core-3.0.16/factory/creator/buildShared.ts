import { immut } from 'limu';
import { HAS_SYMBOL, IS_ATOM, KEY_SPLITER } from '../../consts';
import { recordBlockDepKey } from '../../helpers/blockDep';
import { recordFnDepKeys } from '../../helpers/fnDep';
import { createOb } from '../../helpers/obj';
import { getInternal, mapSharedState } from '../../helpers/state';
import type { Dict, IHeluxParams } from '../../types';
import { canUseDeep, isSymbol, prefixValKey, warn } from '../../utils';
import { getMarkAtomMap } from '../common/atom';
import { recordLastest } from '../common/blockScope';

/**
 * 创建全局使用的共享对象，可提供给 useShared useDerived useWatch derived watch 函数使用
 */
export function buildSharedState(heluxParams: IHeluxParams) {
  let sharedState: Dict = {};
  const { rawState, markedState, sharedKey, shouldSync, createOptions } = heluxParams;
  const { enableReactive, deep, forAtom } = createOptions;
  const collectDep = (valKey: string, keyPath: string[], val: any) => {
    const depKey = prefixValKey(valKey, sharedKey);
    // using shared state in derived/watch callback
    recordFnDepKeys([depKey], { sharedKey, sharedState });
    recordBlockDepKey(sharedState, [depKey]);
    recordLastest(val, sharedState, depKey, keyPath);
  };

  if (canUseDeep(deep)) {
    sharedState = immut(markedState, {
      customKeys: [IS_ATOM as symbol],
      customGet: () => forAtom,
      onOperate: (params) => {
        const { isBuiltInFnKey, fullKeyPath } = params;
        !isBuiltInFnKey && collectDep(fullKeyPath.join(KEY_SPLITER), fullKeyPath, params.value);
      },
    });
  } else {
    sharedState = createOb(markedState, {
      set: (target: Dict, key: any, val: any) => {
        // TODO: enableReactive 机制和现有流程不匹配，可能考虑移除
        if (enableReactive) {
          markedState[key] = val;
          if (shouldSync) {
            rawState[key] = val;
          }

          // TODO: add nextTick mechanism to control update frequency?
          getInternal(markedState).setState({ [key]: val });
        } else {
          warn('changing shared state is invalid');
        }
        return true;
      },
      get: (target: Dict, key: any) => {
        if (key === IS_ATOM) {
          return forAtom;
        }
        const val = target[key];
        if (isSymbol(key)) {
          return val;
        }
        collectDep(key, [key], val);
        return val;
      },
    });
  }
  mapSharedState(sharedKey, sharedState);
  if (!HAS_SYMBOL) {
    getMarkAtomMap().set(sharedState, forAtom);
  }

  return sharedState;
}
