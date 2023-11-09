/// <reference types="node" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as heluxApi from './helux/src-core/types-api';


declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly PUBLIC_URL: string;
  }
}

declare global {
  interface Window {
    ori: any;
    [key: string]: any;
  }
}


declare module '*.avif' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.FunctionComponent<React.SVGProps<
    SVGSVGElement
  > & { title?: string }>;

  const src: string;
  export default src;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module 'helux' {
  export const {
    atom,
    share,
    shareState,
    shareAtom,
    // derive for shared state
    derive,
    deriveAsync,
    // derive for shared atom
    deriveAtom,
    deriveAtomAsync,
    watch,
    runDerive,
    createShared,
    useAtom,
    useShared,
    // use derived state
    useDerived,
    useDerivedAsync,
    // use derived atom
    useAtomDerived,
    useAtomDerivedAsync,
    useWatch,
    useGlobalId,
    useObject,
    useService,
    useForceUpdate,
    useEffect,
    useLayoutEffect,
    useOnEvent,
    useMutable,
    // create action api
    action,
    actionAsync,
    atomAction,
    atomActionAsync,
    // signal api
    signal,
    block,
    blockStatus,
    dynamicBlock,
    dynamicBlockStatus,
    $,
    // emit api
    emit,
    produce,
    shallowCompare,
    isDiff,
    getRawState,
    getRawStateSnap,
    getAtom,
    runMutateFn,
    mutate,
    atomMutate,
    addMiddleware,
    addPlugin,
    EVENT_NAME,
    WAY,
    LOADING_MODE,
  } = heluxApi;
}
