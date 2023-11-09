import { $, share, emit, useOnEvent } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from './comps';

const [sharedState, setState, ctx] = share({ a: 1, b: { b1: { b2: 200 } } }, { moduleName: 'DeriveTask' });

function emitEvent() {
  emit('test_event', 1, 2);
}

function Comp() {
  useOnEvent('test_event', (...args) => {
    console.log('receive args ', ...args);
  });
  return (
    <MarkUpdate>
      shared.xxx {$(sharedState.a)}
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry fns={[emitEvent]}>
    <Comp />
  </Entry>
);

export default Demo;
