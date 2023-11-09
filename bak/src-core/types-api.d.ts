/*
|------------------------------------------------------------------------------------------------
| helux-core@3.0.9
| A state library core that integrates atom, signal, collection dep, derive and watch,
| it supports all react like frameworks.
|------------------------------------------------------------------------------------------------
*/
import type { LimuUtils, IProduce } from 'limu';
import type {
  ChangeDraftCb,
  Fn,
  Atom,
  AtomValType,
  BlockComponent,
  BlockStatusComponent,
  BlockStatusProps,
  ICreateOptions,
  IAtomCreateOptions,
  ISharedCtx,
  IAtomCtx,
  DeriveAtomFn,
  DerivedAtom,
  DerivedResult,
  DeriveFn,
  Dict,
  EffectCb,
  IAsyncTaskParams,
  IBlockOptions,
  IDefMutateFnOptions,
  IDeriveFnParams,
  IPlugin,
  IRenderInfo,
  IsComputing,
  IUseSharedOptions,
  IWatchFnParams,
  Middleware,
  NumStrSymbol,
  PlainObject,
  ReadDep,
  SetAtom,
  SetState,
  SharedDict,
  SharedState,
  SingalVal,
  WatchOptionsType,
  PartialStateCb,
  ActionFnDef,
  Action,
  AsyncActionFnDef,
  AsyncAction,
  AtomActionFnDef,
  AtomAction,
  AtomAsyncActionFnDef,
  AtomAsyncAction,
  LoadingNone,
} from './types';
import type { ReactNode } from './types-react';

export declare const EVENT_NAME: {
  ON_DATA_CHANGED: 'ON_DATA_CHANGED';
};

export declare const LOADING_MODE: {
  NONE: LoadingNone,
  PRIVATE: 'PRIVATE',
  GLOBAL: 'GLOBAL',
};

export declare const WAY: {
  FIRST_RENDER: 'FIRST_RENDER',
  EVERY_RENDER: 'EVERY_RENDER',
};

/**
 * 创建浅依赖收集的共享对象
 *
 * ```
 *  const [ state, setState, ctx ] = share({ a: 100, b: 2 });
 *  // state 可透传给 useSharedObject
 *  // setState 可以直接修改状态
 *  // ctx.call 可以调用服务函数，并透传上下文
 *
 *  // share({ a: 100, b: 2 }, true); // 创建响应式状态
 *  // share({ a: 100, b: 2 }, 'demo'); // 指定模块名
 *  // share({ a: 100, b: 2 }, { moduleName: 'demo', enableReactive: true }); // 既指定模块名，也设定响应式为true
 *
 * ```
 *  以下将举例两种具体的调用方式
 * ```
 * // 调用服务函数第一种方式，直接调用定义的函数，配合 ctx.setState 修改状态
 * function changeAv2(a: number, b: number) {
 *    ctx.setState({ a, b });
 * }
 *
 * // 第二种方式，使用 ret.call(srvFn, ...args) 调用定义在call函数参数第一位的服务函数
 * function changeA(a: number, b: number) {
 *    ctx.call(async function (fnCtx) { // ctx 即是透传的调用上下文，
 *      // args：使用 call 调用函数时透传的参数列表，state：状态，setState：更新状态句柄
 *      // 此处可全部感知到具体的类型
 *      // const { args, state, setState, draft } = fnCtx;
 *
 *      // 直接返回变化的部分数据
 *      return { a, b };
 *      // or 修改 draft
 *      draft.a = a;
 *      drqft.b = b;
 *      // or 混合使用（既修改draft，也返回变化数据）
 *      draft.a = a;
 *      return { b };
 *    }, a, b);
 *  }
 * ```
 * 如需感知组件上下文，则需要`useService`接口去定义服务函数，可查看 useService 相关说明
 */
export function share<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(
  rawState: T | (() => T),
  createOptions?: O,
): readonly [SharedDict<T>, SetState<T>, ISharedCtx<T, O>];

/**
 * 支持共享 primitive 类型值的接口
 */
export function atom<T = any, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(
  rawState: T | (() => T),
  createOptions?: O,
): readonly [Atom<T>, SetAtom<T>, IAtomCtx<T, O>];

/**
 * for compatible wit v2 helux
 * 这个接口仅为了兼容 helux v2 升级到 v3 后不报错
 */
export const createShared: typeof share;

/**
 * 效果完全等同 share，唯一的区别是 share 返回元组 [state,setState,ctx] ，shareState 返回 ctx 自身
 */
export function shareState<T = Dict, O extends ICreateOptions<T> = ICreateOptions<T>>(
  rawState: T | (() => T),
  createOptions?: O,
): ISharedCtx<T, O>;

/**
 * 效果完全等同 atom，唯一的区别是 share 返回元组 [state,setState,call] ，shareAtom 返回 ctx 自身
 */
export function shareAtom<T = Dict, O extends IAtomCreateOptions<T> = IAtomCreateOptions<T>>(
  rawState: T | (() => T),
  createOptions?: O,
): IAtomCtx<T, O>;

/**
 * 以共享状态或其他计算结果为输入，创建计算函数
 * 需注意返回结果必须是 Object
 * @param deriveFn
 * ```
 */
export function derive<T = PlainObject>(deriveFn: (params: IDeriveFnParams) => T): T;

/**
 * 支持异步导出的接口
 * @param sourceFn - 源函数定义，返回计算的参数源和初始的计算结算
 * @param deriveFn - 异步的派生函数定义
 * ```ts
 * // 实例代码
 * const [sharedState, setState, call] = share({ a: 1, b: { b1: { b2: 200 } } });
 * const doubleAResult = derive(() => ({ val: sharedState.a * 2 + random() }));
 * const aPlusB2Result = deriveAsync(
 *  () => ({ source: [sharedState.a, sharedState.b.b1.b2], initial: { val: 0 } }),
 *  async ({ source: [a, b2] }) => {
 *    await delay(1000);
 *    return { val: a + b2 + random() };
 *  }
 * );
 * ```
 */
export function deriveAsync<S = any, R = Dict>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): R;

/**
 * 支持异步导出的另一种写法的接口
 * immediate 表示异步任务是否立即执行，默认 false
 * ```ts
 * const result = deriveTask(() => {
 *   const { a, b } = sharedState; // 定义依赖项
 *   return {
 *     initial: { val: a + b.b1.b2 }, // 定义初始值
 *     task: async () => { // 定义异步计算任务
 *       await delay(1000);
 *       return { val: a + b.b1.b2 + 1 };
 *     },
 *   };
 * });
 * ```
 */
export function deriveTask<R = PlainObject>(
  deriveFn: (taskParams: IDeriveFnParams) => { initial: R; task: () => Promise<R> },
  immediate?: boolean,
): R;

/**
 * 创建一个普通的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtom<T = any>(deriveFn: (params: IDeriveFnParams) => T): Atom<T>;

/**
 * 创建一个异步的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtomAsync<S = any, R = any>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): Atom<R>;

/**
 * 创建一个异步的派生新结果的atom任务，支持返回 pritimive 类型
 */
export function deriveAtomTask<R = any>(
  deriveFn: (taskParams: IDeriveFnParams) => { initial: R; task: () => Promise<R> },
): Atom<R>;

/**
 * 观察共享状态变化，默认 watchFn 立即执行
 * ```ts
 * // 函数内解构完成监听
 * watch(()=>{ console.log(shared.val) }, { immediate: true });
 * // 第二个参数传递依赖收集回调，收集到监听key，不需要立即执行的话可设定 immediate 为 false
 * watch(()=>{ console.log('shared.val changed')}, ()=>[shared.val]);
 * // 第二个参数传递依赖收集回调，收集到监听对象，表示shared发生变化就执行watch回调
 * watch(()=>{ console.log('shared changed')}, ()=>[shared]);
 * // 第二个参数传递依赖收集回调，既设置监听key，也设置监听对象
 * watch(()=>{ console.log('shared1 or shared2.val changed')}, {dep:()=>[shared1,shared2.val]});
 * ```
 */
export function watch(watchFn: (fnParams: IWatchFnParams) => void, options?: WatchOptionsType): void;

/**
 * 使用共享对象，需注意此接口只接受共享对象，如传递普通对象给它会报错 OBJ_NOT_SHARED_ERR
 * ```ts
 * // 在组件外部其他地方创建共享对象
 * const [ sharedObj ] = share({a:1, b:2});
 * // 然后在任意组件里使用即可
 * const [ obj, setObj ] = useShared(sharedObj);
 * ```
 */
export function useShared<T = Dict>(
  sharedObject: T,
  IUseSharedOptions?: IUseSharedOptions<T>,
): [SharedDict<T>, SetState<T>, IRenderInfo];

/**
 * 组件使用 atom，注此接口只接受 atom 生成的对象，如传递 share 生成的对象会报错
 */
export function useAtom<T = any>(sharedState: Atom<T>, options?: IUseSharedOptions<Atom<T>>): [T, SetAtom<T>, IRenderInfo];

/**
 * 使用普通对象，需注意此接口只接受普通对象，如传递共享对象给它会报错 OBJ_NOT_NORMAL_ERR
 * 应用里使用 useObject 替代 React.useState 将享受到以下两个好处
 * ```txt
 * 1 方便定义多个状态值时，少写很多 useState
 * 2 内部做了 unmount 判断，让异步函数也可以安全的调用 setState，避免 react 出现警告 :
 * "Called SetState() on an Unmounted Component" Errors
 * ```
 * 需注意此接口只接受普通对象，如传递共享对象给它会报错 OBJ_NOT_NORMAL_ERR
 * @param initialState
 * @returns
 */
export function useObject<T = Dict>(initialState: T | (() => T)): [T, (partialStateOrCb: Partial<T> | PartialStateCb<T>) => void];

export function useWatch(watchFn: (fnParams: IWatchFnParams) => void, options: WatchOptionsType);

/**
 * 使用全局id，配合 rules[].globalIds 做定向通知更新
 */
export function useGlobalId(globalId: NumStrSymbol): IRenderInfo;

/**
 * 使用服务注入模式开发 react 组件，可配和`useObject`和`useSharedObject`同时使用，详细使用方式见在线示例：
 * @link https://codesandbox.io/s/demo-show-service-dev-mode-ikybly?file=/src/Child.tsx
 * @link https://codesandbox.io/p/sandbox/use-service-to-replace-ref-e5mgr4?file=%2Fsrc%2FApp.tsx
 * > 需注意：当你需要将状态提升为共享时，只需将 useObject 换为 useSharedObject 并传入同样数据协议的共享对象即可
 *
 * 以下是简单示例，可通过`srv.ctx.getProps()`拿到组件的 props 数据
 * ```ts
 *  const [state, setState] = useSharedObject(sharedObj);
 *  // 返回的 srv 是一个稳定的引用，它包含的方式也是稳定的引用
 *  const srv = useService({ props, state, setState }, {
 *    change(label: string) {
 *      // !!! do not use compCtx.state or compCtx.state due to closure trap
 *      // console.log("expired state:", compCtx.state.label);
 *
 *      // get latest state
 *      const state = srv.ctx.getState();
 *      console.log("the latest label in state:", state.label);
 *      // get latest props
 *      const props = srv.ctx.getProps();
 *      console.log("the latest props when calling change", props);
 *
 *      // your logic here
 *      srv.ctx.setState({ label });
 *    }
 *  });
 * ```
 * @param compCtx
 * @param serviceImpl
 */
export function useService<P = Dict, S = Dict, T = Dict>(
  compCtx: {
    props: P;
    state: S;
    setState: (partialState: Partial<S>) => void;
  },
  serviceImpl: T,
): T & {
  ctx: {
    setState: (partialState: Partial<S>) => void;
    getState: () => S;
    getProps: () => P;
  };
};

/**
 * 强制更新
 */
export function useForceUpdate(): () => void;

/**
 * 对齐 React.useEffect
 * 优化了调用逻辑，即 strict 模式与普通模式行为一致，只有一次 mount 与 unmount 产生
 * @param cb
 * @param deps
 */
export function useEffect(cb: EffectCb, deps?: any[]): void;

/**
 * 对齐 React.useLayoutEffect
 * 优化了调用逻辑，即 strict 模式与普通模式行为一致，只有一次 mount 与 unmount 产生
 * @param cb
 * @param deps
 */
export function useLayoutEffect(cb: EffectCb, deps?: any[]): void;

export function useDerived<R = SharedDict>(
  resultOrFn: DerivedResult<R> | DeriveFn<R>,
  readDep?: ReadDep,
): [R, IsComputing, IRenderInfo];

export function useDerivedAsync<S = any, R = SharedDict>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S, R>) => Promise<R>,
  readDep?: ReadDep,
): [R, IsComputing, IRenderInfo];

export function useDerivedTask<R = SharedDict>(
  deriveFn: (taskParams: IDeriveFnParams<R>) => { initial: R; task: () => Promise<R> },
  readDep?: ReadDep,
): [R, IsComputing, IRenderInfo];

export function useAtomDerived<R = any>(resultOrFn: DerivedAtom<R> | DeriveAtomFn<R>): [R, IsComputing, IRenderInfo];

export function useAtomDerivedAsync<S = any, R = any>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S, R>) => Promise<R>,
): [R, IsComputing, IRenderInfo];

export function useAtomDerivedTask<R = any>(
  deriveFn: (taskParams: IDeriveFnParams<R>) => { initial: R; task: () => Promise<R> },
): [R, IsComputing, IRenderInfo];

/**
 * 组件里监听来自 emit 接口发射的事件，会在组件销毁时自动取消监听
 */
export function useOnEvent(name: string, cb: Fn): void;

/**
 * 以 mutable 方式修改 react 状态
 * ```ts
 * const [state, setState] = useMutable({ a: { a1: 1 }, b: 1 });
 * setState({ b: Date.now() }); // 浅层次修改，直接返回即可，内部自动合并
 * setState(draft => draft.a.a1 = Date.now()); // 使用回调方式修改draft
 * ```
 */
export function useMutable<T extends PlainObject>(initialState: T | (() => T)): [
  state: T,
  setDraft: (partialOrDraftCb: Partial<T> | ChangeDraftCb<T>) => void,
];

export function emit<A extends any[] = any[]>(name: string, ...args: A): void;

export function getAtom<T = any>(mayAtom: T): AtomValType<T>;

export function getRawState<T = Dict>(state: T): T;

export function getRawStateSnap<T = Dict>(state: T): T;

/**
 * 人工运行 mutate 函数，未传递任何描述则尝试调用可能存在的单函数
 */
export function runMutateFn(sharedState: SharedState, desc?: string): void;

/**
 * 人工运行 mutate task 函数，未传递任何描述则尝试调用可能存在的单函数
 */
export function runMutateFnTask(sharedState: SharedState, desc?: string): void;

/**
 * 外部定义 mutate 函数（注：mutate 可在 share 接口创建共享对象时定义）
 */
export function defineMutateFns<T = SharedState>(options: IDefMutateFnOptions<T>): void;

export const shallowCompare: LimuUtils['shallowCompare'];

export const isDiff: LimuUtils['isDiff'];

export function runDerive<T = Dict>(result: T): T;

/**
 * 生成 Block 组件，会自动绑定视图中的状态依赖，
 * 注意视图中不能存在判断语句，否则会照成依赖丢失的情况产生
 * ```tsx
 * const [ sharedUser ] = share({...})
 * // ✅ ok
 * const User = block(()=><div>{sharedUser.name}</div>);
 * // ❌ bad
 * const User = block(()=><div>{sharedUser.age >10?sharedUser.name:sharedUser.nickname}</div>);
 *
 * 其他地方渲染User即可 <User />
 * ```
 */
export function block<P = object>(cb: (props: P) => ReactNode, options?: IBlockOptions<P>): BlockComponent<P>;

/**
 * 功能同 block，适用于在组件里调用动态生成组件的场景，会在组件销毁后自动释放掉占用的内存
 * 如果在组件里使用 block 生成组件，也能正常工作，但会额外占用一些不会释放的内存
 */
export function dynamicBlock<P = object>(cb: (props: P) => ReactNode, options: IBlockOptions<P>): BlockComponent<P>;

/**
 * 生成会透传 isCommputing 表示计算状态的 Block 组件，会自动绑定视图中的状态依赖
 */
export function blockStatus<P = object>(
  cb: (props: BlockStatusProps<P>) => ReactNode,
  options?: IBlockOptions<P>,
): BlockStatusComponent<P>;

/**
 * 功能同 blockStatus，适用于在组件里调用动态生成组件的场景，会在组件销毁后自动释放掉占用的内存
 * 如果在组件里使用 blockStatus 生成组件，也能正常工作，但会额外占用一些不会释放的内存
 */
export function dynamicBlockStatus<P = object>(
  cb: (props: BlockStatusProps<P>) => ReactNode,
  options: IBlockOptions<P>,
): BlockStatusComponent<P>;

/**
 * 创建一个具有 signal 响应粒度的视图，仅当传入的值发生变化才渲染且只渲染 signal 区域，helux 同时也导出了 $ 符号表示 signal 函数
 * ```tsx
 * // ✅ ok，传入原始值
 * <div>...long content {$(sharedUser.name)}</div>
 * // ✅ ok，传入包含原始值的atom对象，内部会自动拆开 atom
 * <div>...long content {$(userFullNameAtom)}</div>
 * // ✅ ok，传入定义的 block 组件
 * const User = block(()=><h1>{sharedUser.name}</h1>); // 注：User 也可以当做组件直接实例化 <User />
 * <div>...long content {$(User)}</div>
 * // ✅ ok，复杂渲染逻辑可传入渲染函数，（注：可将这个回调通过 block 抽象为一个组件）
 * <div>...long content {$(()=><div><span>{sharedUser.infoObj.grade}</span><span>{sharedUser.infoObj.addr}</span></div>)}</div>
 *
 * //  atom 响应示例
 * // ✅ ok，传入原始值 atom，推荐这种写法
 * <div>...long content {$(atom)}</div>
 * // ✅ ok，传入拆开的原始值 atom
 * <div>...long content {$(atom.val)}</div>
 * // ✅ ok，传入返回原始值 atom 函数
 * <div>...long content {$(()=>atom)}</div>
 * // ✅ ok，传入返回拆开的原始值 atom 函数
 * <div>...long content {$(()=>atom.val)}</div>
 *
 * // 不成功或有缺陷的响应示例
 * // ❌ bad 传入对象，react 本身也不允许，考虑使用 ()=> ReactNode 写法替代
 * <div>...long content {$(sharedUser.infoObj)}</div>
 * // ❌ bad 传入多个值
 * <div>...long content {$([1,2,3]])}</div>
 * // ❌ 内部存在有判断，可能会造成响应依赖缺失
 * <div>...long content {$(()=><div>{sharedUser.age >10?sharedUser.name:sharedUser.nickname}</div>)}</div>
 * ```
 * @param inputVar
 */
export function signal(inputVar: SingalVal | (() => SingalVal)): ReactNode;

/**
 * signal 函数的简写导出
 */
export const $: typeof signal;

/**
 * 添加中间件，可在数据提交前做二次修改，可写入数据传递给下一个中间件
 * ```ts
 * function myMiddleware({ draft, setData, moduleName, sharedKey, idx }){
 *  setData('key', 1); // 写数据给下一个中间件
 *  draft.time = 2; // 修改数据
 * }
 * ```
 */
export function addMiddleware(mid: Middleware): void;

/**
 * 使用中间件，可监听 helux 内部的各种事件做异步处理
 * ```ts
 *  const myPlugin = {
 *    install(ctx){
 *      // 监听其他将来会扩展的事件
 *      ctx.on('someEvent', ()=>{ ... });
 *      // 监听内置的 onStateChanged 事件
 *      ctx.onStateChanged(({snap})=>{
 *          // 可记录 snap 到 redux-dev-tool
 *      });
 *    },
 *    name: 'myPlugin', // 名称可选
 *    desc: 'this is helux plugin demo', // 描述可选
 *  };
 *  usePlugin(myPlugin);
 * ```
 * @param plugin
 */
export function addPlugin(plugin: IPlugin): void;

/**
 * reexport from limu
 * ```ts
 * // use in react:
 * setState(produce(draft=>{
 *    draft.name = 2;
 * }));
 * ```
 */
export declare const produce: IProduce;

/**
 * ```ts
 * // 不约束args类型，fnDef 函数定义的参数args将是 any[]
 * const someAction = createAction(numAtom)(fnDef, desc);
 * someAction(); // 无约束
 * 
 * // 约束args类型
 * const someAction = createAction(numAtom)<[number, string]>((param)=>{
 *   const args = param.args; // 提示类型 [number, string]
 * }, 'someAction');
 * someAction(1,1); // 这里第二位参数将提示类型错误
 * ```
 * @param sharedDict 
 */
export function createAction<T = SharedDict>(sharedDict: T): <A extends any[] = any[]>(fn: ActionFnDef<A, T>, desc?: string) => Action<A, T>;

export function createAsyncAction<T = SharedDict>(sharedDict: T): <A extends any[] = any[]>(fn: AsyncActionFnDef<A, T>, desc?: string) => AsyncAction<A, T>;

export function createAtomAction<T = any>(atom: Atom<T>): <A extends any[] = any[]>(fn: AtomActionFnDef<A, T>, desc?: string) => AtomAction<A, T>;

export function createAtomAsyncAction<T = any>(atom: Atom<T>): <A extends any[] = any[]>(fn: AtomAsyncActionFnDef<A, T>, desc?: string) => AtomAsyncAction<A, T>;
