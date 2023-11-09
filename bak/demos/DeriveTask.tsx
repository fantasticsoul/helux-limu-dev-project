import { $, share, deriveTask, useDerived } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from './comps';
import { random, delay } from "./logic/util";

const [sharedState, setState] = share({ a: 1, b: { b1: { b2: 200 } } });
const result = deriveTask(() => {
  const { a, b } = sharedState; // 定义依赖项
  console.log('111');
  return {
    initial: { val: a + b.b1.b2 }, // 定义初始值
    task: async () => {
      console.log('222');
      await delay(1000);
      return { val: a + b.b1.b2 + 1 };
    },
  };
});
// const result2 = deriveAsync(
//   () => {
//     const { a, b } = sharedState;
//     return { source: { a, b }, initial: { val: a + b.b1.b2 } };
//   },
//   async () => {
//     await delay(100);
//     return { val: 100 };
//   },
// )


function changeA() {
  setState((draft) => {
    draft.a += 1;
  });
}

function SharedDict() {
  return (
    <MarkUpdate>
      result.val {$(result.val)}
    </MarkUpdate>
  );
}

function UseDerived() {
  const [ret, isCommputing, info] = useDerived(result);
  return (
    <MarkUpdate info={info}>
      {isCommputing ? 'computing' : <>ret.val {$(ret.val)}</>}
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry fns={[changeA]}>
    <SharedDict />
    <SharedDict />
    <UseDerived />
  </Entry>
);

export default Demo;
