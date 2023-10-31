# 使用远程react组件的是示例项目
本项目基于create-react-app搭建，用于示范如何结合`hel-micro`来渲染远程react组件

```ts

// const { createDraft, finishDraft } = limu;
const { createDraft, finishDraft } = immer;

const node = { a: 1 }
const base = { node, wrap: { node } };
const draft = createDraft(base, { onOperate: console.log });
draft.node.a = 100;
const final = finishDraft(draft);

console.log('base', base); // still existed
console.log('final', final); // undefined

```

- test2

```ts

// const { createDraft, finishDraft } = limu;
const { createDraft, finishDraft } = immer;

const node = { a: 1 }
const base = { node, wrap: { node } };
const draft = createDraft(base, { onOperate: console.log });
draft.node.a = 100;
console.log('draft.node.a', draft.node.a);
console.log('draft.wrap.node.a', draft.wrap.node.a);
const final = finishDraft(draft);

console.log('base', base); // still existed
console.log('final', final); // undefined

```

- add apiCtx

```ts
  const limuApis = (() => {
    const apiCtx: { metaMap: Map<any, DraftMeta> } = { metaMap: new Map() };

    // ...
  });

// stopDepDict: { a.b.list : true }

// a.b.list[0].a.b ---> a.b.list[0] 
// a.b.list[0].a.c ---> a.b.list[1]

```