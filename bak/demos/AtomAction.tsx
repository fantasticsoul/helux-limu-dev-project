import React from "react";
import {
  atom,
  useAtom,
  createAtomAction,
  createAtomAsyncAction,
} from "helux";
import { MarkUpdate, Entry } from './comps';
import { random, delay } from './logic/util';

const [numAtom, , ctx] = atom(1, { moduleName: 'AtomAction' });

const someAction = ctx.action(({ draft, args }) => {
  draft.val = (args[0] && Number.isInteger(args[0])) ? args[0] : random();
}, 'someAction');

const someAsyncAction = ctx.asyncAction<[number]>(async ({ setState, args }) => {
  await delay(2000);
  const val = (args[0] && Number.isInteger(args[0])) ? args[0] : random();
  setState(draft => draft.val = val);
}, 'someAsyncAction');
setTimeout(() => {
  someAsyncAction(6000);
}, 6000)


// createAction3(numAtom, fnDef, desc)
// createAction3(numAtom)(fnDef, desc) --> actionFn
// createAction3(numAtom)<[...]>(fnDef, desc) --> actionFn

const actionCool = createAtomAction(numAtom)<[number, string]>(({ setState, args, draft }) => {
  const val = (args[0] && Number.isInteger(args[0])) ? args[0] : random();
  setState(draft => draft.val = val);
}, 'actionCool');

const actionCool2 = createAtomAsyncAction(numAtom)<[number, string]>(async ({ setState, args }) => {
  await delay(2000);
  const val = (args[0] && Number.isInteger(args[0])) ? args[0] : random();
  setState(draft => draft.val = val);
}, 'actionCool2');

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

function NumAtomLoading() {
  const [loading] = ctx.useLoading();
  const [num, , info] = useAtom(numAtom);

  return (
    <MarkUpdate info={info}>
      <pre> {loading['actionCool2'].loading ? 'loading ...' : <>num: {num}</>}</pre>
    </MarkUpdate>
  );
}

function Demo(props: any) {
  return (
    <Entry fns={[someAction, someAsyncAction, actionCool, actionCool2]}>
      <NumAtom />
      <NumAtomLoading />
    </Entry>
  );
}

export default Demo;

// // createAtomAsyncAction
// export function createAction2<T = any>(atom: Atom<T>): <A extends any[] = any[]>(fn: AtomAsyncActionFnDef<A, T>, desc?: string) => AtomAsyncActionFn<A, T>;

// // createAtomAction
// export function createAction3<T = any>(atom: Atom<T>): <A extends any[] = any[]>(fn: AtomActionFnDef<A, T>, desc?: string) => AtomActionFn<A, T>;