import type {
  ISharedCtx,
  IAtomCtx,
  SharedDict,
  SetState,
  Atom,
  Dict,
  Fn,
  ICreateOptionsType,
  IInnerSetStateOptions,
  ISetStateOptions,
  NextSharedDict,
  SetAtom,
  IUseSharedOptions,
} from '../types';
import { asType, isFn } from '../utils';
import { tryGetLoc } from './common/util';
import { buildSharedObject, prepareDeepMutate, prepareNormalMutate, parseOptions } from './creator';
import { useShared } from '../hooks/useShared';
import type { TInternal } from './creator/buildInternal';
import type { ParsedOptions } from './creator/parse';

function makeCallCtx(internal: TInternal, forAtom: boolean, options: ParsedOptions) {
  let ctx: { draft: Dict; finishMutate: any };
  const prepareOpts = { ...options, forAtom, internal };
  if (internal.isDeep) {
    ctx = prepareDeepMutate(prepareOpts);
  } else {
    ctx = prepareNormalMutate(prepareOpts);
  }
  const { draft, finishMutate } = ctx;
  const customOptions: IInnerSetStateOptions = { desc: '' }; // 此处是源头，故设置 desc 初始值 ''
  const setOptions = (options: ISetStateOptions) => {
    Object.assign(customOptions, options); // 此处是源头，故写 desc 即可
  };

  const finish = (partialState: any, customOptions: any) => {
    const nextState = finishMutate(partialState, customOptions);
    return forAtom ? nextState.val : nextState;
  };

  return { draft, finish, setOptions, customOptions };
};

export function createSharedLogic<T = Dict>(
  params: { rawState: T | (() => T); forAtom?: boolean; forGlobal?: boolean },
  createOptions?: ICreateOptionsType<T>,
): any {
  const options = parseOptions(createOptions);
  const loc = tryGetLoc(options.moduleName);

  const { rawState, forAtom = false, forGlobal = false } = params;
  const { sharedState: state, internal } = buildSharedObject(rawState, { ...options, forAtom, forGlobal, loc });
  const setState = forAtom ? internal.setAtom : internal.setState;
  const { syncer, sync } = internal;

  return {
    state,
    setState,
    // change draft in async execute context is dangerours
    asyncCall: (srvFn: Fn, ...args: any[]) => {
      const { draft, finish, setOptions, customOptions } = makeCallCtx(internal, forAtom, options);
      // TODO, pass uncaught err to global err handler
      return Promise.resolve(srvFn({ state, draft, setState, args, setOptions })).then((partialState) => {
        return finish(partialState, customOptions);
      });
    },
    call: (srvFn: Fn, ...args: any[]): NextSharedDict<any> => {
      const { draft, finish, setOptions, customOptions } = makeCallCtx(internal, forAtom, options);
      const partialState = srvFn({ state, draft, setState, args, setOptions });
      return finish(partialState, customOptions);
    },
    useState: (options?: IUseSharedOptions) => {
      return useShared(state, options);
    },
    sync,
    syncer,
  };
}

/** expose as object */
export function shareState<T = Dict>(rawState: T | (() => T), options?: ICreateOptionsType<T>) {
  return createSharedLogic({ rawState }, options);
}

/** expose as tuple */
export function share<T = Dict>(rawState: T | (() => T), options?: ICreateOptionsType<T>): [SharedDict<T>, SetState<T>, ISharedCtx<T>] {
  const ctx = createSharedLogic<T>({ rawState }, options);
  return [ctx.state, ctx.setState, ctx];
}

/**
 * 支持共享 primitive 类型值的接口
 */
export function atom<T = any>(rawState: T | (() => T), options?: ICreateOptionsType<Atom<T>>): [Atom<T>, SetAtom<T>, IAtomCtx<T>] {
  let atomState = asType<Atom<T>>({ val: rawState });
  if (isFn(rawState)) {
    atomState = asType<Atom<T>>({ val: rawState() });
  }

  const ctx = createSharedLogic<Atom<T>>({ rawState: atomState, forAtom: true }, options);
  const setAtom = asType<SetAtom<T>>(ctx.setState);
  return [ctx.state, setAtom, ctx];
}
