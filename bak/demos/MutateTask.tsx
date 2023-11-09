// @ts-nocheck
import React from 'react';
import { atom, share, useShared, useForceUpdate } from 'helux';
import { MarkUpdate } from './comps';
import { log, delay } from './logic/util';

const [numAtom] = atom(3000);
const [priceState, setPrice] = share({ a: 1, b: 100 }, { moduleName: 'MutateTask' });
const [idealPriceState, , ctx] = share({ loading: false, retA: 0, retB: 1 }, {
  moduleName: 'idealPrice',
  mutate: {
    retA: {
      dep: () => [priceState.a, numAtom.val],
      task: async ({ setState, deps }) => {
        setState({ loading: true });
        await delay(1000);
        setState(draft => {
          draft.retA = priceState.a + numAtom.val;
          draft.loading = false;
        });
      },
    },
    retB: (draft) => draft.retB = priceState.b + 2 + numAtom.val,
  },
});

const [finalPriceState] = share({ loading: false, retA: 0, time: 0 }, {
  mutate: {
    // retA: draft => draft.retA = idealPriceState.retA - 600,
    retA: {
      dep: () => [idealPriceState.retA],
      task: async ({ setState }) => {
        setState({ loading: true });
        await delay(1000);
        setState(draft => {
          draft.retA = idealPriceState.retA - 600;
          draft.loading = false;
        });
      },
    }
  },
  before({ desc, draft }) {
    draft.time = Date.now();
    log('finalPriceState', `desc is ${desc}`);
  },
});

function changePrice() {
  setPrice(
    draft => { draft.a += 100 },
    { desc: 'changePrice' },
  );
}


function Price() {
  const [price, , info] = useShared(priceState);
  return <MarkUpdate name="Price" info={info}>{price.a}</MarkUpdate>;
}

function IdealPrice() {
  const [idealPrice, , info] = useShared(idealPriceState);
  const [loading] = ctx.useLoading();

  return <MarkUpdate name="IdealPrice" info={info}>
    <div>{idealPrice.loading ? 'loading' : idealPrice.retA}</div>
    <div>{loading.retA.loading ? 'retA is loading ...' : 'end'}</div>
  </MarkUpdate>;
}

function FinalPrice() {
  const [finalPrice, , info] = useShared(finalPriceState);
  return <MarkUpdate name="FinalPrice" info={info}>
    {finalPrice.loading ? 'loading' : finalPrice.retA}
  </MarkUpdate>;
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
