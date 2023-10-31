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

function ReadAsyncRerived() {
  const [aPlusB2, isComputing, info] = useDerived(aPlusB2Result);

  return (
    <MarkUpdate info={[info]}>
      <div>{isComputing ? 'computing': ''} aPlusB2.val 11 22: {aPlusB2.val}</div>
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry fns={[changeA]}>
    <ReadAsyncRerived />
    <ReadAsyncRerived />
    {/* <ReadRerived />
    <ReadRerived /> */}
  </Entry>
);

export default Demo;
