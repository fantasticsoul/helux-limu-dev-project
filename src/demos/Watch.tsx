import React from 'react';
import { atom, share, watch, useShared, useForceUpdate } from 'helux';
import { MarkUpdate } from './comps';

const [priceState, setPrice] = share({ a: 1 });
const [numAtom, setNum] = atom(3000);

function changePrice() {
  setPrice(draft => { draft.a += 100 }, { desc: 'changeA' });
}

function changePriceAndNum() {
  changePrice();
  setNum(numAtom.val + 1000);
}

watch(() => {
  console.log(`price change to ${priceState.a}`);
});

watch(() => {
  console.log(`found price changed: () => [priceState.a]`);
}, () => [priceState.a]);

watch(() => {
  console.log(`found price changed: [ priceState ]`);
}, () => [priceState]);

watch(() => {
  console.log(`found price or numAtom changed: ()=>[ priceState, numAtom ]`);
}, () => [priceState, numAtom]);


function Price() {
  const [price, , info] = useShared(priceState);
  return <MarkUpdate name="Price" info={info}>{price.a}</MarkUpdate>;
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
    <button onClick={changePrice}>changePrice</button>
    <button onClick={changePriceAndNum}>changePriceAndNum</button>
    {show && <>
      <Price />
      <Price />
    </>}
  </div>
}


export default Entry;
