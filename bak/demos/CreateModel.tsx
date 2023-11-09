import React from 'react';
import { $, createModel, createModelFactory } from 'helux';
import { MarkUpdate, Entry } from './comps';

const model = createModel((api) => {
  const userCtx = api.shareState({ a: 1, b: 2 });
  const { state, setState } = userCtx;
  const someResult = api.deriveAtom(() => state.a + 100);

  function changeA() {
    setState((draft) => {
      draft.a += 1;
    });
  }

  return {
    changeA,
    state,
    someResult,
    setState,
  }
});

const factory = createModelFactory((api, extra) => {
  console.log('received build extra param ', extra)
  const userCtx = api.shareState({ a: 1, b: 2 });
  const { state, setState } = userCtx;
  const someResult = api.deriveAtom(() => state.a + 100);

  function changeA() {
    setState((draft) => {
      draft.a += 1;
    });
  }

  return {
    changeA,
    state,
    someResult,
    setState,
  }
});
const model1 = factory.build(22);
const model2 = factory.build('hi model factory');

console.log(model, model1, model2);

function Comp() {
  return (
    <MarkUpdate>
      <div>model.state.a {$(model.state.a)}</div>
      <div>model1.state.a {$(model1.state.a)}</div>
      <div>model1.state.a {$(model2.state.a)}</div>
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry fns={[model.changeA, model1.changeA, model2.changeA]}>
    <Comp />
  </Entry>
);

export default Demo;
