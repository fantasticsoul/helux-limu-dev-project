import { share, derive, deriveAsync, useShared, useDerived, runDerive } from "helux";
import { random } from "./logic/util";
import { MarkUpdate, Entry } from "./comps";

const delay = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

const [sharedState, setState, call] = share({ a: 1, b: { b1: { b2: 200 } } });
const doubleAResult = derive(() => ({ val: sharedState.a * 2 + random() }));
const aPlusB2Result = deriveAsync(
  () => ({ source: [sharedState.a, sharedState.b.b1.b2], initial: { val: 0 } }),
  async ({ source: [a, b2] }) => {
    await delay(1000);
    return { val: a + b2 + random() };
  }
);
// const transResult1 = derive(() => aPlusB2Result);
// const transResult2 = derive(() => transResult1);
const transResult1 = deriveAsync(
  () => ({ source: [sharedState.a, aPlusB2Result.val], initial: { val: 0 } }),
  async ({ source: [a, val] }) => {
    await delay(1000);
    return { val: a + val + random() };
  },
);
const transResult2 = deriveAsync(
  () => ({ source: [sharedState.a, transResult1.val], initial: { val: 0 } }),
  async ({ source: [a, val] }) => {
    await delay(1000);
    return { val: a + val + random() };
  },
);
const transResult3 = derive(() => {
  return { val: transResult2.val + 5 };
});

function changeA() {
  setState((draft) => {
    draft.a += 100;
  });
}

function ReadRerived() {
  const [doubleA, , info] = useDerived(doubleAResult);

  return (
    <MarkUpdate info={[info]}>
      <div>doubleA: {doubleA.val}</div>
    </MarkUpdate>
  );
}

function ReadTrans1() {
  const [aPlusB2, isComputing, info] = useDerived(transResult1);

  return (
    <MarkUpdate info={[info]}>
      <div>{isComputing ? 'computing' : ''} aPlusB2.val: {aPlusB2.val}</div>
    </MarkUpdate>
  );
}

function ReadTrans2() {
  const [result, isComputing, info] = useDerived(transResult2);

  return (
    <MarkUpdate info={[info]}>
      <div>{isComputing ? 'computing' : ''} transResult2.val: {result.val}</div>
    </MarkUpdate>
  );
}

function ReadTrans3() {
  const [result, isComputing, info] = useDerived(transResult3);

  return (
    <MarkUpdate info={[info]}>
      <div>{isComputing ? 'computing' : ''} transResult3.val: {result.val}</div>
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry fns={[changeA]}>
    {/* <ReadTrans1 />
    <ReadTrans2 /> */}
    <ReadTrans3 />
    {/* <ReadRerived />
    <ReadRerived /> */}
  </Entry>
);

export default Demo;
