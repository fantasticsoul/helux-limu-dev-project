import { getInternal } from '../helpers/state';
import { buildSharedObject, parseOptions, handleDeepMutate, handleNormalMutate } from './creator';
import type {
  Dict, ICreateOptionsType, SetState, Call, NextState, Fn, SharedObject,
} from '../types';

export function createShared<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType<T>,
): { state: SharedObject<T>, setState: SetState<T>, call: Call<T> } {
  const options = parseOptions(strBoolOrCreateOptions);
  const [state, setState] = buildSharedObject(rawState, options);
  const internal = getInternal(rawState);
  return {
    state,
    setState,
    call: (srvFn: Fn, ...args: any[]): NextState<any> => {
      let ctx: { draft: Dict, finishMutate: any };
      if (internal.isDeep) {
        ctx = handleDeepMutate({ internal, ...options });
      } else {
        ctx = handleNormalMutate({ internal });
      }
      const { draft, finishMutate } = ctx;

      return Promise.resolve(srvFn({ state, draft, setState, args }))
        .then((partialState) => finishMutate(partialState));
    },
  };
}

export function share<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType<T>,
) {
  const { state, setState, call } = createShared<T>(rawState, strBoolOrCreateOptions);
  return [state, setState, call] as const; // expose as tuple
}
