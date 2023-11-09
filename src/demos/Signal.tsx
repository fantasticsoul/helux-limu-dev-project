import { $, share, atom, deriveAtom, derive, deriveAsync, block, blockStatus } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from './comps';
import { random, delay } from "./logic/util";


const [sharedState, setState, call] = share({ a: 1, b: { b1: { b2: 200 }, b12: 100 }, name: Date.now() }, { moduleName: 'Signal' });
const stateResult = derive(() => {
  return {
    a: sharedState.a * 100,
    b: sharedState.b.b1.b2 * 100,
  };
});
const aPlusB2Result = deriveAsync({
  deps: () => [sharedState.a, sharedState.b.b1.b2] as const,
  fn: () => ({ val: 0 }),
  task: async ({ input: [a, b] }) => {
    await delay(1000);
    return { val: a + b + random() };
  },
});


const [numAtom, setAtom] = atom(100);
const doubleNum = deriveAtom(() => {
  console.log('deriveAtom doubleNum', numAtom.val * 2 + sharedState.a);
  return numAtom.val * 2 + sharedState.a;
});

// mutate state out of react component
function changeB2() {
  setState((draft) => {
    draft.b.b1.b2 += 100;
  });
}

function changeA() {
  setState((draft) => {
    draft.a += 1;
  });
}

function changeAtom() {
  setAtom(numAtom.val + 100);
}

function SharedDict() {
  return (
    <MarkUpdate>
      shared.xxx {$(sharedState.a)}
    </MarkUpdate>
  );
}

function SharedAtom() {
  console.log('Render CompAtom');
  return (
    <MarkUpdate>
      numAtom {$(numAtom)}
    </MarkUpdate>
  );
}

function SharedAtomVal() {
  console.log('Render CompAtom');
  return (
    <MarkUpdate>
      numAtom.val {$(numAtom.val)}
    </MarkUpdate>
  );
}

function DerivedAtomVal() {
  console.log('Render CompDerivedAtom');
  return (
    <MarkUpdate>
      doubleNum.vall {$(doubleNum.val)}
    </MarkUpdate>
  );
}

function DerivedAtom() {
  console.log('Render CompDerivedAtom');
  return (
    <MarkUpdate>
      doubleNum {$(doubleNum)}
    </MarkUpdate>
  );
}

function CbDerivedAtom() {
  return (
    <MarkUpdate>
      {`() => doubleNum`} {$(() => doubleNum)}
    </MarkUpdate>
  );
}

function CbDerivedAtomVal() {
  return (
    <MarkUpdate>
      {`() => doubleNum.val`} {$(() => doubleNum.val)}
    </MarkUpdate>
  );
}

function CbView() {
  console.log('Render CompDerivedAtom');
  return (
    <MarkUpdate>
      doubleNum signal {$(() => <>
        <h1>{doubleNum.val}</h1>
        <h1>{numAtom.val}</h1>
        <h1>{sharedState.a}</h1>
        <div>
          {$(() => <h1>see nested: {sharedState.b.b1.b2}</h1>)}
        </div>
      </>)}
    </MarkUpdate>
  );
}

const AsyncBlock = blockStatus((props) => {
  const { status } = props;
  const val1 = doubleNum.val;
  const val2 = numAtom.val;
  const val3 = sharedState.a;
  const val4 = aPlusB2Result.val;
  console.log(props);
  if (status.loading) return 'is loading 2';

  return (
    <div className="box">
      <h1>{val1}</h1>
      <h1>{val2}</h1>
      <h1>{val3}</h1>
      <h1>{val4}</h1>
      <div>
        {$(() => <h1>nested: {sharedState.b.b1.b2}</h1>)}
      </div>
    </div>
  );
});

function BlockView() {
  console.log('Render CompDerivedAtom');
  return (
    <MarkUpdate>
      doubleNum signal {$(UserBlock)}
      <UserBlock />
    </MarkUpdate>
  );
}

const UserBlock = block(() => <>
  <h1>ruikun name {sharedState.name}</h1>
  <h1>{doubleNum.val}</h1>
  <h1>{numAtom.val}</h1>
  <h1>{sharedState.a}</h1>
  <div>
    {$(() => <h1>see e cool nested gogo ee gogo: {sharedState.b.b1.b2}</h1>)}
  </div>
</>);

function RuiKun() {
  console.error('Render RuiKun');
  return <div>
    <h4>RuiKun long content</h4>
    <h3>{$(sharedState.name)}</h3>
  </div>
}

function RuiKun2() {
  console.error('Render RuiKun2');
  return <div>
    <h4>RuiKun2 long content</h4>
    <h3>{$(sharedState.b.b1.b2)}</h3>
  </div>
}

function RuiKun3() {
  console.error('Render RuiKun3');
  return <div>
    <h4>RuiKun3 long content</h4>
    <h3>{$(sharedState.b.b12)}</h3>
  </div>
}

function changeName() {
  setState(draft => { draft.name = Date.now() });
}

function changeB22() {
  setState(draft => { draft.b.b1.b2 = Date.now() });
}

function changeB212() {
  setState(draft => { draft.b.b12 = Date.now() });
}

const Demo = () => (
  <Entry fns={[changeB2, changeA, changeAtom, changeName, changeB22, changeB212]}>
    <AsyncBlock />
    <RuiKun />
    <RuiKun2 />
    <RuiKun3 />
    <UserBlock />
    {/* <SharedDict /> */}
    {/* <DerivedAtomVal /> */}
    {/* <SharedAtomVal />
    <SharedAtom /> */}
    {/* <DerivedAtom />
    <CbDerivedAtom />
    <CbDerivedAtomVal /> */}
    {/* <CbView /> */}
    <h1>
      see {$(sharedState.b.b1.b2)}
    </h1>
    {/* <BlockView />
    <UserBlock />
    <AsyncBlock /> */}
  </Entry>
);

// const Demo2 = () => {
//   const forceUpdate = useForceUpdate();
//   return <div>
//     <button onClick={changeA}>changeA</button>
//     <button onClick={forceUpdate}>forceUpdate</button>
//     <SharedDict />
//     <SharedDict />
//     <CbDerivedAtom />
//     <CbDerivedAtomVal />
//   </div>
// }

export default Demo;
