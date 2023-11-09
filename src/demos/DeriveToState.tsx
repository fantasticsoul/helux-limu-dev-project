import React from 'react';
import {
  useShared, share, watch, useForceUpdate, derive, useDerived, useDerivedAsync,
  deriveAsync, runDerive, createShared,
} from 'helux';
import * as util from './logic/util';


const ori = { a: 50, doubleA: 0, b: 2, c: { c1: 100, c2: 1000 }, list: [{ name: 'one', age: 1 }] };
console.log(ori);
const [ret, setState, call] = share(ori, {
  // const { state: ret, setState } = createShared(ori, {
  moduleName: 'd2s', exact: true,
  rules: [
    { when: (state) => [state.list, state.c.c1, state.c.c2], ids: ['list'] },
  ],
});

watch(() => {
  const { a } = ret;
  setState(draft => { draft.doubleA = a * 2 });
});

const coolWrap = derive(() => {
  const { doubleA } = ret;
  return { cool: doubleA + 19 }
});

const outRet = deriveAsync({
  deps: () => [ret.doubleA] as const,
  fn: () => ({ val: 0 }),
  task: async ({ input: [doubleA] }) => {
    await util.delay();
    return { val: doubleA + 100 };
  },
});

// @ts-ignore
window.runDerive = () => runDerive(outRet);

function change_a() {
  setState(draft => {
    draft.a = util.random();
  });
  console.log('ret.a', ret.a);
  console.log('ret.doubleA', ret.doubleA);
}

function A() {
  console.log('Render A', ret);
  const [state] = useShared(ret);
  return (
    <div>
      {state.a}
    </div>
  );
}

function DoubleA() {
  console.log('Render DoubleA');
  const [state] = useShared(ret);
  return (
    <div>
      state.doubleA：{state.doubleA}
    </div>
  );
}

function ReadCool() {
  console.log('Render ReadCool');
  const [coolCu] = useDerived(coolWrap);
  return (
    <div>
      read derived val 22: {coolCu.cool}
    </div>
  );
}

function DeriveInComp() {
  console.log('Render DeriveInComp');
  const [coolCu] = useDerived(() => {
    const { doubleA } = ret;
    return { val: doubleA + 50 };
  });
  return (
    <div>
      read derived val in comp ffff: {coolCu.val}
    </div>
  );
}

function DeriveAsyncInComp() {
  console.log('Render DeriveAsyncInComp');

  // TODO CHECK
  const [coolCu] = useDerivedAsync({
    deps: () => [ret.doubleA] as const,
    fn: () => ({ val: 0 }),
    task: async ({ input: [doubleA] }) => {
      await util.delay();
      return { val: doubleA + 100 };
    },
  });

  const [outData] = useDerived(outRet);
  return (
    <div>
      async derived: {coolCu.val}
      <br />
      out async derived ee: {outData.val}
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
      <DoubleA />
      <ReadCool />
      <DeriveInComp />
      <DeriveAsyncInComp />
    </>}
  </div>
}

export default Entry;
