// @ts-nocheck
import React from 'react';
import {
  useShared, share, watch, useForceUpdate, useDerived
} from 'helux';
import * as util from './logic/util';
import { createDraft } from 'limu';

const node = { a: 1 }
const base = { node, wrap: { node } };
const draft = createDraft(base, { onOperate: console.log });
draft.node.a = 100;
console.log('draft.node.a', draft.node.a);
console.log('draft.wrap.node.a', draft.wrap.node.a);
console.log('1', draft.node);
console.log('2', draft.wrap.node);


const ori = {
  a: 50,
  doubleA: 0,
  b: 2,
  c: { c1: 100, c2: 1000 },
  list: [{ name: 'one', age: 1 }],
  f: {
    f1: {
      newNode: {} as any,
    },
  },
  g: {
    newNode2: {} as any,
  },
};
const [ret, setState, call] = share(ori, {
  moduleName: 'd2s', exact: true,
  rules: [
    { when: (state) => [state.list, state.c.c1, state.c.c2], ids: ['list'] },
  ],
  // compute: {
  //   initial: ()=>({double:0});
  //   fns: {
  //     doubleA({raw, draft}){
  //     },
  //   }
  // }
});

watch(() => {
  const { a } = ret;
  setState(draft => {
    console.log('watch and change a');
    draft.doubleA = a * 2;
    const c = draft.c;
    const newNode = { c };
    draft.f.f1.newNode = newNode;
    draft.g.newNode2 = newNode;

    draft.f.f1.newNode.c.c1 = 3000 + util.random(100);
  });
});

util.bindToWindow({ ret, ori });

function change_a() {
  setState(draft => {
    draft.a = util.random();
  });
  console.log('ret.a', ret.a);
  console.log('ret.doubleA', ret.doubleA);
}

function A() {
  console.log('Render A');
  const [state] = useShared(ret);
  return (
    <div>
      {state.a}
    </div>
  );
}

function C() {
  console.log('Render DoubleA');
  const [state] = useShared(ret);
  return (
    <div>
      state.c.c1：{state.c.c1}
    </div>
  );
}

function AnotherC() {
  console.log('Render ReadCool');
  const [state] = useShared(ret);
  return (
    <div>
      state.f.f1.newNode.c.c1: {state.f.f1.newNode.c?.c1}
      <br />
      state.g.newNode2.c.c1: {state.g.newNode2.c?.c1}
      <br />
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
    {show && <>
      <A />
      <C />
      <AnotherC />
    </>}
  </div>
}

export default Entry;
