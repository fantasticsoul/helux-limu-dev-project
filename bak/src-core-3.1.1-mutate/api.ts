import { limuUtils, produce } from 'limu';
import { derive, deriveAsync, deriveAtom, deriveAtomAsync } from './factory/createDerived';
import { atom, share, shareState, shareAtom } from './factory/createShared';
import { watch } from './factory/createWatch';
import { action, actionAsync, atomAction, atomActionAsync } from './factory/createAction';
import { runMutateFn, mutate, atomMutate } from './factory/createMutate';
import { EVENT_NAME, WAY, LOADING_MODE } from './consts/user';
import { getAtom } from './factory/common/atom';
import { addMiddleware } from './factory/common/middleware';
import { addPlugin } from './factory/common/plugin';
import { emit } from './factory/common/userBus';
import { runDerive } from './helpers/fnRunner';
import { getRawState, getRawStateSnap } from './helpers/state';
import { useAtomDerived, useAtomDerivedAsync, useDerived, useDerivedAsync } from './hooks/useDerived';
import { useEffect, useLayoutEffect } from './hooks/useEffect';
import { useForceUpdate } from './hooks/useForceUpdate';
import { useGlobalId } from './hooks/useGlobalId';
import { useObject } from './hooks/useObject';
import { useService } from './hooks/useService';
import { useAtom, useShared } from './hooks/useShared';
import { useWatch } from './hooks/useWatch';
import { useOnEvent } from './hooks/useOnEvent';
import { useMutable } from './hooks/useMutable';
import { block, blockStatus, dynamicBlock, dynamicBlockStatus, signal } from './signal';

const { shallowCompare, isDiff } = limuUtils;
const createShared = share; // for compatible wit v2 helux
const $ = signal; // signal api alias

export {
  // share api
  atom,
  share,
  shareState,
  shareAtom,
  createShared,
  // derive api
  derive,
  deriveAsync,
  deriveAtom,
  deriveAtomAsync,
  runDerive,
  // hooks api
  useAtom,
  useShared,
  useDerived,
  useDerivedAsync,
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
  // action api
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
  // mutate api
  mutate,
  atomMutate,
  runMutateFn,
  // emit api
  emit,
  produce,
  shallowCompare,
  isDiff,
  getRawState,
  getRawStateSnap,
  getAtom,
  watch,
  addMiddleware,
  addPlugin,
  EVENT_NAME,
  WAY,
  LOADING_MODE,
};
