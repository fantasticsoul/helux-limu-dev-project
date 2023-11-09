/**
 * react like lib
 */
import { asType, noop } from './utils';

// this is a mock lib, it will be replaced to real react lib later
export const react = {
  useState: <T = any>(initial: T | (() => T)) => {
    return [asType<T>(initial), noop] as [T, (state: T | ((state: T) => Partial<T>)) => Partial<T>];
  },
  useRef: <T = any>(initial: T) => ({ current: initial }),
  useEffect: noop,
  useLayoutEffect: noop,
  useMemo: <T = any>(initial: () => T, deps: any[]) => {
    return initial();
  },
  createElement: noop,
  memo: noop,
  // for react 18
  useSyncExternalStore: noop,
};

export function setReactLib(lib: any) {
  Object.assign(react, lib);
}
