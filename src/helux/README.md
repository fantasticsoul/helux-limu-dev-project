
## 问题
解决 proxyResult 为 primitive 时，如何获取到读依赖



新增 deriveVal(()=> T):{val:T}

derive(()=> '') // 将会报错
注，已换为 driveAtom

## todo

- 还原之前版本，然后再加上 triggerReasons 和 rerunComputedFn

share 自动选择 isDeep: true or false
移除 enableReactive 参数

 - 重命名所有api, 
createShared ---> share
createSharedDeep ---> shareDeep


createComputed ---> derive
createComputedAsync ---> deriveAsync
createComputedAsync ---> deriveTask


derivePrimitive --> {val: number}
derivePrimitiveAsync --> {val: number}
derivePrimitiveTask --> {val: number}

```ts
shareD(()=>({a:1, b:2, c:3}), {stable:true})


const ret = derive(()=>undefined);

derive(()=>{
  /** */
},{ deps:[ ret1, ret2 ]})
```


 - 支持stable，获取到更精准的更新范围

 a.b.c --> a.b.c    a.b   a

 a.b.c.d.e -->  1/a.b.c.d.e  1/a.b.c.d  1

 return { a:1, b:2, c:3 }

 ##
 TODO 判断 atom 标记 IS_ATOM_RESULT symbol

## 
TODO add global id
TODO id 支持 symbol

## watch 
TODO 支持 watch options

## share chain
[done]
[todo] init 支持函数


## rules
支持收窄依赖收集

```ts
share({a:{a1:{list:[]}}, b:{b1:{b21:1, b22: 2}}}, {
  rules: [
    { when: state => state.a.a1.list, stopDep: true },
    { when: state => state.b.b1, stopDep: true },
  ]
})
```
测试

## setStateOptions
支持 id globalId



## 新版 reactive
```ts
/**
 * deep模式下，生成limu返回的草稿状态，用户可以对草稿做任意修改，且不会影响原状态
 */
export function handleReactiveMutate(opts: IHandleDeepMutateOpts) {
  const { internal } = opts;

  const mutateCtx = newMutateCtx();
  const handleOpts = { state: {}, mutateCtx, ...opts };
  const draft = createDraft(internal.rawState, {
    onOperate(opParams) {
      handleOperate(opParams, { internal, mutateCtx });
    },
  });

  return {
    draft,
    // 暴露 commit(IInnerSetStateOptions)
    // customOptions 是为了方便 sharedState 链里的 mutate 回调里提供一个 setOptions 句柄让用户有机会定义 setStateOptions 控制一些额外的行为
    finishMutate(customOptions?: IInnerSetStateOptions) {
      const { writeKeys, writeKeyPathInfo } = mutateCtx;
      mutateCtx.depKeys = Object.keys(writeKeys);
      handleOpts.state = current(draft); // current need support structural sharing
      mutateCtx.triggerReasons = Object.values(writeKeyPathInfo);
      Object.assign(handleOpts, customOptions);
      handleState(handleOpts);

      return opts.internal.rawStateSnap;
    },
  };
}

function debounce(fn, wait){
  let timer = null;
  const wrapFn = (..args)=>{
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{
      fn(...args);
    }, wait);
  };
  return wrapFn;
}

tryflushChanged(){
  reactiveInternals.forEach((internal)=>{
    internal.flush();
  });
}

// wrapped by debounce
function flush(){
  if(!modified) return;
  internal.modified = false;
  const snap = current(reactiveProxy);
  Object.assign(rawState, snap);
}

// handleDeepMutate 支持透传 mutateCtx，控制不生成 draft
// mutateCtx 需要支持复用，flush 之后再生成一个新的

```

## share/atom stateFn 支持收集依赖

## view signal

## type

Atom
AtomDerived
AtomVal
AtomDeriveFn

SharedDict
SharedDictDerived
SharedDeriveFn


Atom
DerivedAtom
AtomVal
AtomDeriveFn

SharedState = SharedDict | Atom;

## useDerived 支持 id globalId

## 移除
enableRecordResultDep 命名为 readDep，表示读了result才产生依赖
isResultReaded rename to isReaded

## setState setAtom 支持设定 ids globalIds


## careDeriveStatus
重命名为 showProcess，已标记了 TODO，追加了 IUseDerivedAsyncOptions

## 精简 useSharedLogic
替换掉 useObject

## result
proxy 替换为limu proxy，以便让深层次的 signal result 也能正常读取

## setState 支持配置 stopDeps

## block【done】
修改 view 为 block
```ts
const User = block(()=>(
  <div>gogogo</div>
  <div>user</div>
));
```
## 结果中转【done】

static fn 不支持结果中转，避免产生各种异常情况

hook fn 才支持，是为了让 useDerived 可以写

## computing 维护【done】
支持首次计算的函数也能正确标记 isComputing
> 已解决，引入了 computeMod

## 支持 stopDepDepth
设定依赖收集的深度
未设定深度时，
对于修改对象 draft.a.b.c.d.e = 5 可收集得 a|b|c|d|e
对于修改数组 draft.a.b.list[0] = 5 可收集得 a|b|list|0
对于修改数组 draft.a.b.c.d.f[0] = 5 可收集得 a|b|c|d|f|0

设定 stopDepDepth = 3 后，
上述修改对象可得 a|b|c
上述修改数组1可得 a|b|list|0
上述修改数组2可得 a|b|c

## block 支持 isComputing【done】
已支持
```tsx
const UserBlock = block((props: BlockProps<Props>)=>{
  const { isComputing } = props;
  const { a, b, c } = state;

  if(isComputing){
    return <h1>computing</h1>
  }

  return (
    <div>
      <h1>{a}</h1>
      <h1>{b}</h1>
      <h1>{c}</h1>
    </div>
  );
})
```

## 更优化的 desc 设置

desc 支持伴随 detail 提交

```tsx
function mutateByDesc(options){
  options.rules.forEach(rule=>{
    watch(()=>{
      commitDesc(options.to, rule.desc);
    }, ()=>rule.when(options.form));
  });
}

mutateByDesc({
  from: someShared,
  to: anotherShared,
  rules: [
    { when: (state)=>state.a, desc: 'changeA' }
  ]
});


watch(()=>{
  commitDesc(anotherShared, 'changeA');
}, ()=>[someShared.a])

```


### setAtom 回调自动拆 draft

### change
change 支持单函数
```ts
share(0, { change: ()=> aShare.val + 100 });
```


### 新增 asyncMutate
```ts
share({a:1}, {
  mutate: [
    {
      desc: 'changeXXX',
      deps: ()=> [some.a , another.b],
      fn: (draft)=> draft.c = some.a +1; // 仅执行一次
      task: async({ setState }){
        setState({loading: true});
        await delay(2000);
        setState(draft=> draft.c= Date.now());
      },
    }
  ]
})

share({a:1}, {
  mutate: {
    changeXXX: {
      fn: (draft)=> draft.c = some.a + another.b,
      task: async(){},
    },
    // justChange: { // 由watch 替代
    //   watch: [ some, other ],
    //   fn: (draft)=> draft.c = Date.now(),
    //   task: async(){},
    // },
    // justChange2: { // 由watch 替代
    //   watch: [ some, other ],
    //   task: async(){},
    // },
  }
})

share({a:1}, {
  mutate: (draft)=> draft.c = some.a + another.b,
})

share({a:1}, {
  mutate: {
    changeXXX: (draft)=> draft.c = some.a + another.b,
    changeYYY: {
      fn: (draft)=> draft.d = some.b + another.b,
      task: async(){},
    }
  }
})

```

### 支持读取 mutateLoading done

```ts
  const [ atom, setAtom, ctx ] = useAtom(xxAtom, { loading: true });
  const { loading, status, err } = ctx.loading.retA;

  share(); 
  // --> createShared();
  // --> after configure mutateFns
  // --> is has task fn, create shared again
  // --> createShared({ // mark inner shared
  //  retA: { loading, status, err },
  //  retB: { loading, status, err },
  // })

```

### 新增 createMutate ，createAsyncMutate 并联动loading

```ts
const fn = call(()=>{

}, 1,2,3);

function createMutate(sharedState, fn, { desc: string }){
  return (...args: any[])=>{
    fn(...args)
  },
}

const gogogo = createMutate(sharedState, ({ setState, args })=>{

}, 'gogogo');

gogo(1,2,3);


```

新版 deriveAsync
```ts
deriveAsync({
  fn: () => ({ val: sharedState.a + sharedState.b }),
  // deps: () => [sharedState.a, sharedState.b],
  task: async () => {
  },
})
```

## MutateFnItem 改为 deps，传给 task
done 最终传递 input
```ts
// old
export type MutateFnItem<T = SharedState> = { desc?: string, fn?: MutateFn<T>, dep?: () => any, task?: null | MutateTask<T> };

// new
export type MutateFnItem<T = SharedState, A = any[]> = { desc?: string, fn?: MutateFn<T>, deps?: () => A, task?: null | MutateTask<T, A> };

// MutateTask <-- A
// IMutateTaskParam <-- A
```

## 优化内置的  stopDep 规则
1 数组自动 stopDep，如需要则人工开启
2 stopDepDepth 默认为 6 超过则停止，需需要更深的收集需人工调整
## api文档

### 快速开始
### share( mutate, moduleName, rules, deep, exact, enableLoading, loadingMode )
### atom ( mutate, moduleName, rules, deep, exact, enableLoading, loadingMode )
### derive ( derive, deriveAtom, deriveAsync, deriveAtomAsync )
### watch ( deps, immediate )
### signal( signal, block, blockStatus, dynamicBlock, dynamicBlockStatus )
### hooks ( useLoading, .... )
### loading ( useLoading, privateLoading, globalLoading, useGlobalLoading, deriveLoading )
### mutate  ( mutate, atomMutate )
### action  ( action, actionAsync, atomAction, atomActionAsync )
### util
### model
### event
### plugin
### middleware
### 示范代码集合