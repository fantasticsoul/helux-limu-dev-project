import React from 'react';
import { mutate, share, useShared } from 'helux';
import { MarkUpdate, Entry } from './comps';
import { random, delay } from './logic/util';

const [priceState, setPrice] = share({ a: 1, b: 100 }, { moduleName: 'Api_mutate' });
const [finalPriceState, , ctx] = share({ retA: 0, time: 0 }, { moduleName: 'Api_mutate_finalPriceState' });

// 外部定义 mutate 函数
const witness = mutate(finalPriceState)({
  fn: (draft) => draft.retA += 100, // 初始值函数，只会执行一次
  deps: () => [priceState.a] as const,
  task: async ({ input: [a], setState }) => {
    await delay(100);
    setState(draft => { draft.retA += a });
  },
  immediate: true, // 控制 task 立即执行
});

function changePrice() {
  setPrice(draft => { draft.a = random() });
}

function forceRunMutate() {
  witness.call();
};

function Price() {
  const [price, , info] = useShared(priceState);
  return <MarkUpdate name="Price" info={info}>{price.a}</MarkUpdate>;
}

function FinalPrice() {
  const [finalPrice, , info] = useShared(finalPriceState);
  const [loading] = ctx.useLoading();
  const status = loading[witness.desc];

  return <MarkUpdate name="FinalPrice" info={info}>
    {status.loading && 'loading'}
    {status.err && status.err.message}
    {status.ok && <>finalPrice.retA: {finalPrice.retA}</>}
  </MarkUpdate>;
}

const Demo = () => (
  <Entry fns={[forceRunMutate, changePrice]}>
    <Price />
    <Price />
    <FinalPrice />
    <FinalPrice />
  </Entry>
);


export default Demo;
