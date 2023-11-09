import { useShared, useAtom } from '../hooks/useShared';
import { getGlobalSharedState } from '../hooks/useGlobalId';
import type {
  Dict,
  Fn,
  IAtomCtx,
  ICreateOptions,
  IAtomCreateOptions,
  IInnerSetStateOptions,
  ISetStateOptions,
  ISharedCtx,
  NextSharedDict,
  LoadingState,
} from '../types';
import { isFn } from '../utils';
import { buildSharedObject, prepareDeepMutate, prepareNormalMutate } from './creator';
import type { TInternal } from './creator/buildInternal';
import type { ParsedOptions, IInnerOptions } from './creator/parse';

function makeCallCtx(internal: TInternal, options: ParsedOptions) {
  let ctx: { draft: Dict; finishMutate: any };
  const prepareOpts = { ...options, internal };
  if (internal.isDeep) {
    ctx = prepareDeepMutate(prepareOpts);
  } else {
    ctx = prepareNormalMutate(prepareOpts);
  }
  const { draft, finishMutate } = ctx;
  const customOptions: IInnerSetStateOptions = { desc: 'call.setState' };
  const setOptions = (options: ISetStateOptions) => {
    Object.assign(customOptions, options); // 此处是源头，故写 desc 即可
  };

  const finish = (partialState: any, customOptions: any) => {
    const nextState = finishMutate(partialState, customOptions);
    return options.forAtom ? nextState.val : nextState;
  };

  return { draft, finish, setOptions, customOptions };
}

function getRawState(innerOptions: IInnerOptions) {
  const { forAtom = false } = innerOptions
  let rawState: any = innerOptions.rawState;
  if (forAtom) {
    rawState = isFn(rawState) ? { val: rawState() } : { val: rawState };
  }
  return rawState;
}

export function createSharedLogic(
  innerOptions: IInnerOptions,
  createOptions?: any,
): any {
  const rawState: any = getRawState(innerOptions);
  const { sharedState: state, internal, parsedOptions } = buildSharedObject({ ...innerOptions, rawState }, createOptions);
  const { syncer, sync, forAtom, mutateFns } = internal;
  const setState = forAtom ? internal.setAtom : internal.setState;
  const useFn: any = forAtom ? useAtom : useShared;

  const rawLoading: LoadingState = {};
  let loading: LoadingState = {};
  mutateFns.forEach(item => {
    if (item.desc) {
      rawLoading[item.desc] = { loading: false, status: true, err: null };
    }
  });
  let hasLoading = false;
  if (Object.keys(rawLoading).length) {
    hasLoading = true;
    const loadingCtx = createSharedLogic({ rawState: rawLoading });
    internal.loadingCtx = loadingCtx;
    loading = loadingCtx.state;
  }

  return {
    state,
    loading,
    setState,
    // change draft in async execute context is dangerours
    asyncCall: (srvFn: Fn, ...args: any[]) => {
      const { draft, finish, setOptions, customOptions } = makeCallCtx(internal, parsedOptions);
      // TODO, pass uncaught err to global err handler
      return Promise.resolve(srvFn({ state, draft, setState, args, setOptions })).then((partialState) => {
        return finish(partialState, customOptions);
      });
    },
    call: (srvFn: Fn, ...args: any[]): NextSharedDict<any> => {
      const { draft, finish, setOptions, customOptions } = makeCallCtx(internal, parsedOptions);
      const partialState = srvFn({ state, draft, setState, args, setOptions });
      return finish(partialState, customOptions);
    },
    useState: (options?: any) => {
      return useFn(state, options);
    },
    useLoading: () => {
      const [loadingState] = useShared(hasLoading ? loading : getGlobalSharedState());
      return loadingState;
    },
    sync,
    syncer,
  };
}

/** expose share ctx as object */
export function shareState<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(
  rawState: T | (() => T), options?: O,
): ISharedCtx<T, O> {
  return createSharedLogic({ rawState }, options);
}

/** expose atom ctx as object */
export function shareAtom<T = any, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(
  rawState: any | (() => any), options?: O,
): IAtomCtx<T, O> {
  return createSharedLogic({ rawState, forAtom: true }, options);
}

/** expose share ctx as tuple */
export function share<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(rawState: T | (() => T), options?: O) {
  const ctx = createSharedLogic({ rawState }, options) as ISharedCtx<T, O>;
  return [ctx.state, ctx.setState, ctx] as const;
}

/**
 * expose atom ctx as object，支持共享 primitive 类型值
 */
export function atom<T = any, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(rawState: T | (() => T), options?: O) {
  const ctx = createSharedLogic({ rawState, forAtom: true }, options) as IAtomCtx<T, O>;
  return [ctx.state, ctx.setState, ctx] as const;
}