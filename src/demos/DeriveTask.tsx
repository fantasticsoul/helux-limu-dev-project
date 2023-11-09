import { $, share, deriveAsync, useDerived } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from './comps';
import { random, delay } from "./logic/util";

const [sharedState, setState] = share({ a: 1, b: { b1: { b2: 200 } } });
const result = deriveAsync({
  deps: () => [sharedState.a, sharedState.b.b1.b2] as const, // 定义依赖项
  fn: ({ input: [a, b2] }) => ({ val: a + b2 }),// 定义初始值
  task: async ({ input: [a, b] }) => {
    await delay(1000);
    return { val: a + b + 1 };
  },
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
