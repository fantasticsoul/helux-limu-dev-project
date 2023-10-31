import { limuUtils } from 'limu';
// prettier-ignore
import './factory/root';
// prettier-ignore
import { atom, createShared, derive, deriveAsync, deriveAtom, deriveAtomAsync, deriveAtomTask, deriveTask, share, watch } from './factory';
import { getAtom } from './factory/common/scope';
import { runDerive } from './helpers/fndep';
import { getRawState, getRawStateSnap } from './helpers/state';
import { useAtomDerived, useAtomDerivedAsync, useAtomDerivedTask, useDerived, useDerivedAsync, useDerivedTask } from './hooks/useDerived';
import { useEffect, useLayoutEffect } from './hooks/useEffect';
import { useForceUpdate } from './hooks/useForceUpdate';
import { useGlobalId } from './hooks/useGlobalId';
import { useObject } from './hooks/useObject';
import { useService } from './hooks/useService';
import { useAtom, useShared } from './hooks/useShared';
import { useWatch } from './hooks/useWatch';
import { signal } from './signal';
import { block } from './signal/block';

const { shallowCompare, isDiff } = limuUtils;
const shareState = createShared;
const $ = signal; // signal api alias

export {
  atom,
  share,
  shareState,
  // derive for shared state
  derive,
  deriveAsync,
  deriveTask,
  // derive for shared atom
  deriveAtom,
  deriveAtomAsync,
  deriveAtomTask,
  watch,
  runDerive,
  createShared,
  useAtom,
  useShared,
  // use derived state
  useDerived,
  useDerivedAsync,
  useDerivedTask,
  // use derived atom
  useAtomDerived,
  useAtomDerivedAsync,
  useAtomDerivedTask,
  useWatch,
  useGlobalId,
  useObject,
  useService,
  useForceUpdate,
  useEffect,
  useLayoutEffect,
  shallowCompare,
  isDiff,
  getRawState,
  getRawStateSnap,
  block,
  signal,
  $,
  getAtom,
};
