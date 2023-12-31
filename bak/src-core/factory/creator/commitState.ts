import { immut } from 'limu';
import { createOb } from '../../helpers/obj';
import type { Dict, IInnerSetStateOptions } from '../../types';
import { delListItem, isFn, nodupPush, setNoop, setVal } from '../../utils';
import { getDepKeyByPath, IMutateCtx } from '../common/util';
import type { TInternal } from './buildInternal';
import { execDepFnAndInsUpdater } from './updater';

export interface ICommitStateOptions extends IInnerSetStateOptions {
  state: Dict;
  internal: TInternal;
  mutateCtx: IMutateCtx;
  forAtom: boolean;
  desc?: any;
  prevDesc?: any;
}

/** 干预 setState 调用结束后收集到的依赖项（新增或删除） */
function interveneDeps(isAdd: boolean, opts: ICommitStateOptions) {
  const { extraDeps, excludeDeps } = opts;
  const fn = isAdd ? extraDeps : excludeDeps;
  if (!isFn(fn)) {
    return;
  }

  const {
    mutateCtx: { depKeys },
    internal: { rawState, sharedKey, isDeep },
  } = opts;
  let state: any;
  const record = (keyPath: string[]) => {
    const depKey = getDepKeyByPath(keyPath, sharedKey);
    isAdd ? nodupPush(depKeys, depKey) : delListItem(depKeys, depKey);
  };

  if (isDeep) {
    state = immut(rawState, {
      onOperate: ({ fullKeyPath, isBuiltInFnKey }) => !isBuiltInFnKey && record(fullKeyPath),
    });
  } else {
    state = createOb(rawState, {
      set: setNoop,
      get: (target: Dict, key: any) => {
        record([key]);
        return target[key];
      },
    });
  }

  fn(state);
}

export function commitState(opts: ICommitStateOptions) {
  const { state, internal, isAsync, mutateCtx } = opts;
  const { rawState } = internal;

  if (isAsync) {
    // for dangerous async mutate
    mutateCtx.keyPathValue.forEach((keyPath, value) => {
      setVal(rawState, keyPath, value);
    });
  } else {
    Object.assign(rawState, state);
  }

  if (internal.isDeep) {
    // now state is a structural sharing obj generated by limu
    internal.rawStateSnap = state;
  } else {
    internal.rawStateSnap = { ...rawState };
  }
  interveneDeps(true, opts);
  interveneDeps(false, opts);
  execDepFnAndInsUpdater(opts);
}
