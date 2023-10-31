import { isObj } from '../utils';
import { buildSharedObject, parseOptions } from './creator';
import type {
  Dict, ICreateDeepOptions, ICreateOptionsType, ICreateDeepOptionsFull, ModuleName,
  SharedObject, Mutable, NextState, ISetStateOptions,
} from '../types';

/** 一些在 isDeep 为 true 时生效的设置 */
interface IDeepOptions {
  isDeep?: boolean;
  exact?: ICreateDeepOptionsFull['exact'];
  rules?: ICreateDeepOptionsFull['rules'];
}

function buildReturn(rawState: any, inputOptions: any, deepOptions?: IDeepOptions) {
  const options = parseOptions(inputOptions);
  const { isDeep = false, exact = false, rules = [] } = deepOptions || {};
  const [state, setState] = buildSharedObject(rawState, { ...options, isDeep, exact, rules });
  return {
    state,
    call: (srvFn: any, ...args: any[]) => {
      Promise.resolve(srvFn({ state, setState, args })).then((partialState) => {
        partialState && setState(partialState);
      });
    },
    setState,
  };
}

export function createShared<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType,
): {
  state: SharedObject<T>;
  call: <A extends any[] = any[]>(
    srvFn: (ctx: {
      args: A;
      state: T;
      setState: (partialState: Partial<T>) => void;
    }) => Promise<Partial<T>> | Partial<T> | void,
    ...args: A
  ) => void;
  setState: (partialState: Partial<T>, options?: ISetStateOptions<T>) => void;
} {
  return buildReturn(rawState, strBoolOrCreateOptions);
}

export function createDeepShared<T extends Dict = Dict>(
  rawState: T | (() => T),
  createOptions?: ModuleName | ICreateDeepOptions<T>,
): {
  state: SharedObject<T>;
  call: <A extends any[] = any[]>(
    srvFn: (ctx: {
      args: A;
      state: T;
      setState: (recipe: (mutable: Mutable<T>) => void, options?: ISetStateOptions<T>) => NextState;
    }) => Promise<Partial<T>> | Partial<T> | void,
    ...args: A
  ) => void;
  setState: (recipe: (mutable: Mutable<T>) => void, options?: ISetStateOptions<T>) => NextState;
} {
  let exact = false;
  let rules: ICreateDeepOptionsFull['rules'] = [];
  if (isObj(createOptions)) {
    exact = createOptions.exact ?? false;
    rules = createOptions.rules || [];
  }
  return buildReturn(rawState, createOptions, { isDeep: true, exact, rules });
}
