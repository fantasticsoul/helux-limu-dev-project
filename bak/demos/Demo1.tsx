import { share, derive, deriveAsync, useShared, useDerived, runDerive, atom } from "helux";
import { random } from "./logic/util";
import { MarkUpdate } from "./comps";

const delay = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

// create multi shared state with deep dependencies collection strategy
const [sharedState, setState, ctx] = share(
  { a: 1, b: { b1: { b2: 200 } } },
  {
    mutate: {
      cool: draft => { draft.a += 1 },
    }
  }
);

const [a2, seAtom, atomCtx] = atom(
  { a: 1, b: { b1: { b2: 200 } } },
  {
    mutate: {
      xx: ({ val: draft }) => { draft.a += 1 },
    }
  }
);

// create sync derive result with one shared state
const doubleAResult = derive(() => ({ val: sharedState.a * 2 + random() }));
// create async derive result with multi shared state
const aPlusB2Result = deriveAsync(
  () => ({ source: [sharedState.a, sharedState.b.b1.b2], initial: { val: 0 } }),
  async ({ source: [a, b2] }) => {
    await delay(1000);
    return { val: a + b2 + random() };
  }
);

// @ts-ignore
window.rr = () => runDerive(doubleAResult);
// @ts-ignore
window.rr2 = () => runDerive(aPlusB2Result);

// use derived result to generate another result
const cu2Ret = derive(() => ({ val: doubleAResult.val + 100 }));

// mutate state out of react component
function changeA() {
  setState((draft) => {
    draft.a += 100;
  });
}

function changeAWithCall(num?: number) {
  ctx.call(function ({ draft, args }) { // call ctx { draft, state, setState, args }
    draft.a += args[0] || 100
  }, num); // 透传参数给 callCtx
}

function DemoReadShareState() {
  // read shared state
  const [state, setState, info] = useShared(sharedState);
  // mutate in compoment
  const mutableSet = () =>
    setState((draft) => {
      draft.a += 100;
    });
  const classicalSet = () => setState((draft) => ({ a: draft.a + 1 }));

  return (
    <MarkUpdate info={info}>
      <div>{state.a}</div>
      <button onClick={mutableSet}>mutableSet in comp</button>
      <button onClick={classicalSet}>classicalSet in comp</button>
      {/* call mutate method out of component */}
      <button onClick={changeA}>call set out of comp</button>
      <button onClick={() => changeAWithCall(666)}>call set out of comp: changeAWithCall</button>
    </MarkUpdate>
  );
}

function DemoReadRerivedResult() {
  // read computed
  const [doubleA, , info] = useDerived(doubleAResult);
  const [cu2, , info2] = useDerived(cu2Ret);
  const [aPlusB2, isComputing, info3] = useDerived(aPlusB2Result);

  return (
    <MarkUpdate info={[info, info2, info3]}>
      <div>doubleA: {doubleA.val}</div>
      <div>aPlusB2: {isComputing ? "computing" : aPlusB2.val}</div>
      <div>cu2: {cu2.val}</div>
    </MarkUpdate>
  );
}

export default function Demo1() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <DemoReadShareState />
      <DemoReadShareState />
      <DemoReadRerivedResult />
      <DemoReadRerivedResult />
    </div>
  );
}
