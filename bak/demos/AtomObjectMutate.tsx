import React from 'react';
import { atom, share, useShared, useForceUpdate, useAtom } from 'helux';
import { MarkUpdateH3 as MarkUpdate, Entry } from './comps';
import { randomStr } from './logic/util';

const [infoAtom, setAtom] = atom(
  { price: 100, info: { from: 'bj', owner: 'fancy', detail: { street: 'n2' } } },
  { moduleName: 'AtomObjectMutate' }
);
const [funnyAtom] = atom({
  double: 0, funnyName: '',
}, {
  mutate: [
    (draft) => draft.val.double = infoAtom.val.price * 2,
    ({ val }) => {
      const { from, detail } = infoAtom.val.info;
      val.funnyName = `${from}_${detail.street}`;
    },
  ]
});
const [nickAtom] = atom({ nickName: '' }, {
  mutate: ({ val }) => {
    const { owner } = infoAtom.val.info;
    val.nickName = `${funnyAtom.val.funnyName}|owner:${owner}`;
  },
});

function changePrice() {
  setAtom(draft => { draft.val.price += 100 }, { desc: 'changePrice' });
}

function changeStreet() {
  setAtom(draft => { draft.val.info.detail.street = `${randomStr()}` }, { desc: 'changeStreet' });
}

function InfoAtom() {
  const [base, , info] = useAtom(infoAtom);
  return <MarkUpdate name="InfoAtom" info={info}>{base.price}</MarkUpdate>;
}

function FunnyAtom() {
  const [funny, , info] = useAtom(funnyAtom);
  return <MarkUpdate name="FunnyAtom" info={info}>{funny.funnyName}</MarkUpdate>;
}

function FunnyAtomDouble() {
  const [funny, , info] = useAtom(funnyAtom);
  return <MarkUpdate name="FunnyAtomDouble" info={info}>{funny.double}</MarkUpdate>;
}

function NickAtom() {
  const [nick, , info] = useAtom(nickAtom);
  return <MarkUpdate name="NickAtom" info={info}>{nick.nickName}</MarkUpdate>;
}

function Demo(props: any) {
  return <Entry fns={[changePrice, changeStreet]}>
    <InfoAtom />
    <InfoAtom />
    <FunnyAtom />
    <FunnyAtom />
    <FunnyAtomDouble />
    <FunnyAtomDouble />
    <NickAtom />
    <NickAtom />
  </Entry>
}


export default Demo;
