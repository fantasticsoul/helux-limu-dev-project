import React from 'react';
import { atom, share, useShared, useForceUpdate, defineMutateRules, runMutateDescs } from '../helux/src';
import { MarkUpdate } from './comps';
const fake = { a: 1, b: 'fake' };
const [numAtom] = atom(3000);
const [priceState, setPrice] = share({ a: 1, b: 100 });
const [idealPriceState] = share({ retA: 0, retB: 1 }, {
  watch: [priceState], // 仅当定义 mutate 时，才需要定义 watch
  // mutate: ({ draft, desc }) => {
  //   if (desc === 'changeA') {
  //     draft.retA = priceState.a + 1000 + numAtom.val;
  //   }
  //   if (desc === 'changeB') {
  //     draft.retB = priceState.b + 2 + numAtom.val;
  //   }
  // },
  // 设定一个 mutateWrap
  // mutateWrap(options) {
  //   change[options.desc]?.(options.draft);
  //   mutate(options);
  // },

  mutate: ({ draft, desc }) => {
    // change[desc](draft) ;
    if (desc === 'changeA') {
      draft.retA = priceState.a + 1000 + numAtom.val;
    }
    if (desc === 'changeB') {
      draft.retB = priceState.b + 2 + numAtom.val;
    }
  },
  // change:{
  //   retA: (draft) => draft.retA = priceState.a + 1000 + numAtom.val,
  //   retB: (draft) => draft.retB = priceState.b + 2 + numAtom.val,
  // },
  // asyncMutate: ()=>{
  // };
});

const [finalPriceState] = share({ retA: 0 }, {
  watch: [idealPriceState, numAtom],
  mutate: ({ draft, desc }) => {
    if (desc === 'cc') {
      draft.retA = idealPriceState.retA - 600;
    }
  },
});

// runMutateDescs(idealPriceState, ['changeA', 'changeB']);
// runMutateDescs(finalPriceState, ['cc']);
// runDescs(finalPriceState, ['changeA']);
defineMutateRules({
  target: idealPriceState,
  rules: [
    { when: () => priceState.a, desc: 'changeA' }
  ]
});

function changePrice() {
  setPrice(
    draft => { draft.a += 100 },
  );
}


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
