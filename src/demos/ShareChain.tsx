import React from 'react';
import { atom, share, useShared, useForceUpdate } from 'helux';
import { MarkUpdate } from './comps';

const [priceState, setPrice] = share({ a: 1 });
const [numAtom] = atom(3000);

function changePrice() {
  setPrice(
    draft => { draft.a += 100 },
    { desc: 'changeA' }, // 加一个更新凭据，方便后续链路处理
  );
}

const [idealPriceState] = share({ retA: 0 }, {
  watch: [priceState, numAtom],
  mutate: ({ draft, desc }) => {
    if (desc === 'changeA') {
      draft.retA = priceState.a + 1000 + numAtom.val;
    }
  },
})

const [finalPriceState] = share({ retA: 0 }, {
  watch: [idealPriceState, numAtom],
  mutate: ({ draft, desc }) => {
    if (desc === 'changeA') {
      draft.retA = idealPriceState.retA - 600;
    }
  },
})

function Price() {
  const [price, , info] = useShared(priceState);
  return <MarkUpdate name="Price" info={info}>{price.a}</MarkUpdate>;
}

function IdealPrice() {
  const [idealPrice, , info] = useShared(idealPriceState);
  return <MarkUpdate name="IdealPrice" info={info}>{idealPrice.retA}</MarkUpdate>;
}

function FinalPrice() {
  const [finalPrice, , info] = useShared(finalPriceState);
  return <MarkUpdate name="FinalPrice" info={info}>{finalPrice.retA}</MarkUpdate>;
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
    {show && <>
      <Price />
      <Price />
      <IdealPrice />
      <IdealPrice />
      <FinalPrice />
      <FinalPrice />
    </>}
  </div>
}


export default Entry;
