import React from "react";
import {
  AtomValType,
  atom,
  watch,
  useAtomDerived,
  useAtom,
  deriveAtom,
  createAtomAction,
} from "helux";
import { MarkUpdate, Entry } from './comps';
import { random } from './logic/util';

const [numAtom, setAtom, ctx] = atom(1, { moduleName: 'Atom' });

const numPlusAtom = deriveAtom(() => {
  return numAtom.val + 100;
});

const numPlus200Atom = deriveAtom(() => {
  return numPlusAtom.val + 200;
});

function changeNumOutOfComp() {
  setAtom(numAtom.val + 1);
}

function changeNumByDraftOutOfComp() {
  setAtom((d) => (d.val += 2));
}

// const aciton = createAtomAction(numAtom)<[number, string]>(({ draft, args }) => {
//   draft.val += 100;
// }, 'hi action');
// console.log('aciton ', aciton);

// const aciton2 = createAtomAction(numAtom)<[number, string]>(({ draft, args }) => {
//   draft.val += 100;
// }, 'hi action');
// console.log('aciton ', aciton);

const someAction = ctx.action(({ draft, args }) => {
  draft.val = (args[0] && Number.isInteger(args[0])) ? args[0] : random();
}, 'someAction');

watch((params) => {
  const { val } = numAtom;
  console.log("val changed -->", val);
});

function NumAtom() {
  const [num, setNum, info] = useAtom(numAtom);
  const changeNum = () => setNum(num + 1);
  const changeNumByDraft = () => setNum((d) => (d.val += 2));

  return (
    <MarkUpdate info={info}>
      <pre>num: {num}</pre>
      <button onClick={changeNum}>changeNum</button>
      <button onClick={changeNumByDraft}>changeNumByDraft</button>
    </MarkUpdate>
  );
}

function NumPlusAtom() {
  const [num, , info] = useAtomDerived(numPlusAtom);

  return (
    <MarkUpdate info={info}>
      <pre>num plus: {num}</pre>
    </MarkUpdate>
  );
}

function NumPlus200Atom() {
  const [num, , info] = useAtomDerived(numPlus200Atom);

  return (
    <MarkUpdate info={info}>
      <pre>num plus 200: {num}</pre>
    </MarkUpdate>
  );
}

function Demo(props: any) {
  return (
    <Entry fns={[changeNumOutOfComp, changeNumByDraftOutOfComp, someAction]}>
      <NumAtom />
      <NumAtom />
      <NumPlusAtom />
      <NumPlusAtom />
      <NumPlus200Atom />
      <NumPlus200Atom />
    </Entry>
  );
}

export default Demo;

