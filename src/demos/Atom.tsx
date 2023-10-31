import React from "react";
import {
  atom,
  watch,
  useAtomDerived,
  useAtom,
  useForceUpdate,
  deriveAtom,
} from "helux";

const [numAtom, setAtom] = atom(1);

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

watch((params) => {
  const { val } = numAtom;
  console.log("val changed -->", val);
});

function NumAtom() {
  const [num, setNum] = useAtom(numAtom);
  const changeNum = () => setNum(num + 1);
  const changeNumByDraft = () => setNum((d) => (d.val += 2));

  return (
    <div>
      <pre>num: {num}</pre>
      <button onClick={changeNum}>changeNum</button>
      <button onClick={changeNumByDraft}>changeNumByDraft</button>
    </div>
  );
}

function NumPlusAtom() {
  const [num] = useAtomDerived(numPlusAtom);

  return (
    <div>
      <pre>num plus: {num}</pre>
    </div>
  );
}

function NumPlus200Atom() {
  const [num] = useAtomDerived(numPlus200Atom);

  return (
    <div>
      <pre>num plus 200: {num}</pre>
    </div>
  );
}

function Entry(props: any) {
  console.log("Render Entry");
  const [show, setShow] = React.useState(true);
  const showRef = React.useRef(show);
  const forceUpdate = useForceUpdate();
  showRef.current = show;

  return (
    <div>
      <button onClick={() => setShow(!show)}>switch show</button>
      <button onClick={forceUpdate}>force update</button>
      <button onClick={changeNumOutOfComp}>changeNumOutOfComp</button>
      <button onClick={changeNumByDraftOutOfComp}>changeNumByDraftOutOfComp</button>
      {show && (
        <>
          <NumAtom />
          <NumAtom />
          <NumPlusAtom />
          <NumPlusAtom />
          <NumPlus200Atom />
          <NumPlus200Atom />
        </>
      )}
    </div>
  );
}

export default Entry;
