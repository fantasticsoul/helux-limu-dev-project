import React from 'react';
import { atom, useAtom, useForceUpdate } from 'helux';
import { MarkUpdate } from './comps';

const [numAtom, setAtom] = atom({ a: 1, b: 2 });

function changeA() {
  setAtom(draft => { draft.val.a += 100 });
}

function changeB() {
  setAtom(draft => { draft.val.b += 1 });
}

function changeAB() {
  setAtom(draft => {
    draft.val.a += 100;
    draft.val.b += 1;
  });
}

function changeABWithNewObj() {
  setAtom(draft => {
    const { a, b } = draft.val;
    draft.val = { a: a + 100, b: b + 1 }
  });
}

function ReadA() {
  const [num, , info] = useAtom(numAtom);
  return <MarkUpdate name="ReadA" info={info}>{num.a}</MarkUpdate>;
}

function ReadB() {
  const [num, , info] = useAtom(numAtom);
  return <MarkUpdate name="ReadB" info={info}>{num.b}</MarkUpdate>;
}

function ReadAB() {
  const [num, , info] = useAtom(numAtom);
  return <MarkUpdate name="ReadB" info={info}>{num.a} - {num.b}</MarkUpdate>;
}

function NoRead() {
  const [, , info] = useAtom(numAtom);
  return <MarkUpdate name="NoRead" info={info}>nothing</MarkUpdate>;
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
    <button onClick={changeA}>changeA</button>
    <button onClick={changeB}>changeB</button>
    <button onClick={changeAB}>changeAB</button>
    <button onClick={changeABWithNewObj}>changeABWithNewObj</button>
    {show && <>
      <ReadA />
      <ReadA />
      <ReadB />
      <ReadB />
      <ReadAB />
      <ReadAB />
      <NoRead />
    </>}
  </div>
}


export default Entry;
