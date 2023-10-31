import { getInternal } from '../helpers/state';
import { buildSharedObject, parseOptions, handleDeepMutate, handleNormalMutate } from './creator';
import type {
  Dict, ICreateOptionsType, SharedObject, Mutable, NextState, ISetStateOptions, Fn,
} from '../types';


function buildReturn(rawState: any, inputOptions?: ICreateOptionsType) {
  const options = parseOptions(inputOptions);
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

export function createShared<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType,
): {
  state: SharedObject<T>;
  setState: (
    partialStateOrRecipeCb: Partial<T> | ((mutable: Mutable<T>) => void),
    options?: ISetStateOptions<T>,
  ) => NextState<T>;
  call: <A extends any[] = any[]>(
    srvFn: (ctx: {
      args: A;
      state: Readonly<T>;
      draft: Mutable<T>;
      setState: (
        partialStateOrRecipeCb: Partial<T> | ((mutable: Mutable<T>) => void),
        options?: ISetStateOptions<T>,
      ) => NextState<T>;
    }) => Promise<Partial<T>> | Partial<T> | void,
    ...args: A
  ) => NextState<T>;
} {
  return buildReturn(rawState, strBoolOrCreateOptions);
}

export function share<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType,
) {
  const { state, setState, call } = createShared<T>(rawState, strBoolOrCreateOptions);
  return [state, setState, call] as const; // expose as tuple
}
