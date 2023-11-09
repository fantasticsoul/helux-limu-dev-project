import { limuUtils, produce } from 'limu';
import { derive, deriveAsync, deriveAtom, deriveAtomAsync, deriveAtomTask, deriveTask } from './factory/createDerived';
import { atom, share, shareState, shareAtom } from './factory/createShared';
import { watch } from './factory/createWatch';
import { createAction, createAsyncAction, createAtomAction, createAtomAsyncAction } from './factory/createAction';
import { EVENT_NAME, WAY, LOADING_MODE } from './consts/user';
import { getAtom } from './factory/common/atom';
import { addMiddleware } from './factory/common/middleware';
import { addPlugin } from './factory/common/plugin';
import { emit } from './factory/common/userBus';
import { runDerive } from './helpers/fnRunner';
import { getRawState, getRawStateSnap } from './helpers/state';
import { useAtomDerived, useAtomDerivedAsync, useAtomDerivedTask, useDerived, useDerivedAsync, useDerivedTask } from './hooks/useDerived';
import { useEffect, useLayoutEffect } from './hooks/useEffect';
import { useForceUpdate } from './hooks/useForceUpdate';
import { useGlobalId } from './hooks/useGlobalId';
import { useObject } from './hooks/useObject';
import { useService } from './hooks/useService';
import { useAtom, useShared } from './hooks/useShared';
import { useWatch } from './hooks/useWatch';
import { useOnEvent } from './hooks/useOnEvent';
import { useMutable } from './hooks/useMutable';
import { runMutateFn, runMutateFnTask, defineMutateFns } from './mutate';
import { block, blockStatus, dynamicBlock, dynamicBlockStatus, signal } from './signal';

const { shallowCompare, isDiff } = limuUtils;
const createShared = share; // for compatible wit v2 helux
const $ = signal; // signal api alias

export {
  atom,
  share,
  shareState,
  shareAtom,
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
  useOnEvent,
  useMutable,
  // create action api
  createAction, 
  createAsyncAction, 
  createAtomAction, 
  createAtomAsyncAction,
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
  runMutateFnTask,
  defineMutateFns,
  addMiddleware,
  addPlugin,
  EVENT_NAME,
  WAY,
  LOADING_MODE,
};
