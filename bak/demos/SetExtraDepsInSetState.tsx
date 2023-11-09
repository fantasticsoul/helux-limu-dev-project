// @ts-nocheck
import React from 'react';
import { useShared, createShared, useForceUpdate } from 'helux';
import * as util from './logic/util';

const ori = { a: 50, doubleA: 0, b: 2, c: { c1: 100, c2: 1000 }, list: [{ name: 'one', age: 1 }] };
const [ret, setState] = createShared(ori, {
  moduleName: 'd2s', exact: true,
  rules: [
    { when: (state) => [state.list, state.c.c1, state.c.c2], ids: ['list'] },
  ]
});

function change_a() {
  setState(draft => {
    draft.a = util.random();
  }, { extraDeps: state => state.b });
}

function change_a_noExtraDeps() {
  setState(draft => {
    draft.a = util.random();
  });
}

function A() {
  console.log('Render A');
  const [state] = useShared(ret);
  return (
    <div>
      {state.a} update at: {util.timemark()}
    </div>
  );
}

function B() {
  console.log('Render B');
  const [state] = useShared(ret);
  return (
    <div>
      {state.b} update at: {util.timemark()}
    </div>
  );
}

function Entry(props: any) {
  console.log('Render Entry');
  const [show, setShow] = React.useState(true);
  const showRef = React.useRef(show);
  const forceUpdate = useForceUpdate();
  showRef.current = show;

  return <div>
    <button onClick={() => setShow(!show)}>switch show</button>
    <button onClick={forceUpdate}>force update</button>
    <button onClick={change_a}>change_a</button>
    <button onClick={change_a_noExtraDeps}>change_a_noExtraDeps</button>
    {show && <>
      <A />
      <B />
    </>}
  </div>
}

Entry.desc = '演示 setState 时，设置 extraDeps 的效果';

export default Entry;
