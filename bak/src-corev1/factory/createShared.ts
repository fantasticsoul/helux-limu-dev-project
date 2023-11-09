import type {
  Atom,
  Call,
  Dict,
  Fn,
  ICreateOptionsType,
  IInnerSetStateOptions,
  ISetStateOptions,
  NextSharedDict,
  SetAtom,
  SetState,
  SharedDict,
} from '../types';
import { asType, isFn } from '../utils';
import { parseOptions } from './common/parse';
import { tryGetLoc } from './common/util';
import { buildSharedObject, prepareDeepMutate, prepareNormalMutate } from './creator';

export function createSharedLogic<T extends Dict = Dict>(
  params: { rawState: T | (() => T); forAtom?: boolean; forGlobal?: boolean },
  createOptions?: ICreateOptionsType<T>,
): { state: SharedDict<T>; setState: SetState<T>; call: Call<T>; asyncCall: Call<Promise<T>> } {
  const options = parseOptions(createOptions);
  const loc = tryGetLoc(options.moduleName);

  const { rawState, forAtom = false, forGlobal = false } = params;
  const { sharedState: state, internal } = buildSharedObject(rawState, { ...options, forAtom, forGlobal, loc });
  const setState = forAtom ? internal.setAtom : internal.setState;

  const makeCallCtx = () => {
    let ctx: { draft: Dict; finishMutate: any };
    const prepareOpts = { ...options, forAtom, internal, sharedState: state };
    if (internal.isDeep) {
      ctx = prepareDeepMutate(prepareOpts);
    } else {
      ctx = prepareNormalMutate(prepareOpts);
    }
    const { draft, finishMutate } = ctx;
    const customOptions: IInnerSetStateOptions = { desc: null }; // 此处是源头，故设置 desc 初始值 null
    const setOptions = (options: ISetStateOptions) => {
      Object.assign(customOptions, options); // 此处是源头，故写 desc 即可
    };
    return { draft, finishMutate, setOptions, customOptions };
  };
  const finish = (finishMutate: Fn, partialState: any, customOptions: any) => {
    const nextState = finishMutate(partialState, customOptions);
    return forAtom ? nextState.val : nextState;
  };

  return {
    state,
    setState,
    // change draft in async execute context is dangerours
    asyncCall: (srvFn: Fn, ...args: any[]) => {
      const { draft, finishMutate, setOptions, customOptions } = makeCallCtx();
      // TODO, pass uncaught err to global err handler
      return Promise.resolve(srvFn({ state, draft, setState, args, setOptions })).then((partialState) => {
        return finish(finishMutate, partialState, customOptions);
      });
    },
    call: (srvFn: Fn, ...args: any[]): NextSharedDict<any> => {
      const { draft, finishMutate, setOptions, customOptions } = makeCallCtx();
      const partialState = srvFn({ state, draft, setState, args, setOptions });
      return finish(finishMutate, partialState, customOptions);
    },
  };
}

/** expose as object */
export function shareState<T extends Dict = Dict>(rawState: T | (() => T), options?: ICreateOptionsType<T>) {
  return createSharedLogic({ rawState }, options);
}

/** expose as tuple */
export function share<T extends Dict = Dict>(rawState: T | (() => T), options?: ICreateOptionsType<T>) {
  const ctx = createSharedLogic<T>({ rawState }, options);
  return [ctx.state, ctx.setState, ctx] as const;
}

/**
 * 支持共享 primitive 类型值的接口
 */
export function atom<T extends any = any>(rawState: T | (() => T), options?: ICreateOptionsType<Atom<T>>) {
  let atomState = asType<Atom<T>>({ val: rawState });
  if (isFn(rawState)) {
    atomState = asType<Atom<T>>({ val: rawState() });
  }

  const ctx = createSharedLogic<Atom<T>>({ rawState: atomState, forAtom: true }, options);
  const setAtom = asType<SetAtom<T>>(ctx.setState);
  return [ctx.state, setAtom, ctx] as const;
}
