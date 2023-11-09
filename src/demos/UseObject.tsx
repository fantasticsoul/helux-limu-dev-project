import { useObject } from 'helux';
import React from 'react';
import { MarkUpdate, Entry } from './comps';
import { log, logRed } from './logic/util';

function Comp() {
  const [state, setState] = useObject({ a: 1, b: 2 });
  const updateA = () => {
    setState({ a: Date.now() }); // only pass partial state
  };
  const updateB = () => {
    setState({ b: Date.now() }); // only pass partial state
  };
  React.useEffect(() => {
    console.log('setState is a stable ref'); // print only one time
  }, [setState]);

  return (
    <MarkUpdate>
      <div>state.a {state.a}</div>
      <div>state.b {state.b}</div>
      <button onClick={updateA}>update a</button>
      <button onClick={updateB}>update b</button>
    </MarkUpdate>
  );
}

const Demo = () => (
  <Entry>
    <Comp />
  </Entry>
);

export default Demo;
