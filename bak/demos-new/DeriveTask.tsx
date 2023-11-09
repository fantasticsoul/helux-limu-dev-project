import { $, share, deriveAsync, useDerived } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from '../../src/demos/comps';
import { random, delay } from "../../src/demos/logic/util";

const [sharedState, setState] = share({ a: 1, b: { b1: { b2: 200 } } });
const result = deriveAsync({
  fn: () => ({ val: 0 }),
  deps: () => [sharedState.a, sharedState.b],
  task: async () => {
    const { a, b } = sharedState;
    console.log('222');
    await delay(1000);
    return { val: a + b.b1.b2 + 1 + random() };
  },
  immediate: true,
});

const result2 = deriveAsync({
  fn: () => ({ val: sharedState.a + result.val }),
  task: async () => {
    await delay(1000);
    if (random() > 10) {
      throw new Error('err occured');
    }
    return { val: sharedState.a + result.val + random() };
  },
  immediate: true,
});

const result3 = deriveAsync({
  fn: () => ({ val: 0 }),
  deps: () => [result2],
  task: async () => {
    await delay(500);
    // if (random() > 10) {
    //   throw new Error('err occured');
    // }
    return { val: result2.val + random() };
  },
  immediate: true,
});


function changeA() {
  setState((draft) => {
    draft.a += 1;
  });
}

function SharedDict() {
  const [ret, status] = useDerived(result);
  console.log('SharedDict status', status);
  return (
    <MarkUpdate>
      {status.loading && 'loading ...'}
      {status.err && status.err.message}
      {status.ok && <>result.val {ret.val}</>}
    </MarkUpdate>
  );
}

function SharedDict2() {
  const [ret, status] = useDerived(result2);
  console.log('SharedDict2 status', status);
  return (
    <MarkUpdate>
      {status.loading && 'loading ...'}
      {status.err && status.err.message}
      {status.ok && <>result2.val {result2.val}</>}
    </MarkUpdate>
  );
}

function Result3() {
  const [ret, status] = useDerived(result3);
  console.log('SharedDict2 status', status);
  return (
    <MarkUpdate>
      {status.loading && 'loading ...'}
      {status.err && status.err.message}
      {status.ok && <>result3.val {result3.val}</>}
    </MarkUpdate>
  );
}

// function UseDerived() {
//   const [ret, isCommputing, info] = useDerived(result);
//   return (
//     <MarkUpdate info={info}>
//       {isCommputing ? 'computing' : <>ret.val {$(ret.val)}</>}
//     </MarkUpdate>
//   );
// }

const Demo = () => (
  <Entry fns={[changeA]}>
    <SharedDict />
    <SharedDict />
    <SharedDict2 />
    <SharedDict2 />
    <Result3 />
    <Result3 />
    {/* <UseDerived /> */}
  </Entry>
);

export default Demo;
