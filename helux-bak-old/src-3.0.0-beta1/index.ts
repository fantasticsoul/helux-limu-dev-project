import './factory/root';
import { limuUtils } from 'limu';
import { createShared, share, derive, deriveAsync, deriveTask, watch } from './factory';
import * as advance from './helpers/advance';
import { runDerive } from './helpers/fndep';
import { getRawState } from './helpers/state';
import { useDerived } from './hooks/useDerived';
import { useDerivedAsync } from './hooks/useDerivedAsync';
import { useDerivedTask } from './hooks/useDerivedTask';
import { useEffect, useLayoutEffect } from './hooks/useEffect';
import { useForceUpdate } from './hooks/useForceUpdate';
import { useObject } from './hooks/useObject';
import { useService } from './hooks/useService';
import { useShared } from './hooks/useShared';
import { useWatch } from './hooks/useWatch';

const { shallowCompare, isDiff } = limuUtils;

export {
  share,
  derive,
  deriveAsync,
  deriveTask,
  watch,
  runDerive,
  createShared, // for compatible wit v2 helux
  advance,
  useShared,
  useDerived,
  useDerivedAsync,
  useDerivedTask,
  useWatch,
  useObject,
  useService,
  useForceUpdate,
  useEffect,
  useLayoutEffect,
  shallowCompare,
  isDiff,
  getRawState,
};
