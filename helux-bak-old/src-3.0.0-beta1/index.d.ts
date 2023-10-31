/*
|------------------------------------------------------------------------------------------------
| helux@3.0.0
| A simple and powerful react state library with dependency collection, derived and watch,
| compatible with react 18 concurrency mode.
|------------------------------------------------------------------------------------------------
*/
import type {
  Dict, DictN, EffectCb, ICreateOptionsType, SharedObject, PlainObject, ISetStateOptions,
  Mutable, NextState, IFnParams, IAsyncTaskParams, IWatchFnParams,
} from './types';

type Advance = {
  /** after calling getDepStats, mem depStats will be cleanup automatically */
  getDepStats: () => DictN<Array<string>>;
  getSharedState: (sharedKey: number) => Dict;
};

/**
 * @deprecated
 * unstable currently ( for helux-signal in the future )
 */
export const advance: Advance;

type SetState<T extends Dict = Dict> = (
  partialStateOrRecipeCb: Partial<T> | ((mutable: Mutable<T>) => (void | Partial<T>)),
  options?: ISetStateOptions<T>,
) => NextState<T>;

type Call<T extends Dict = Dict> = <A extends any[] = any[]>(
  srvFn: (ctx: {
    args: A;
    state: Readonly<T>;
    draft: Mutable<T>;
    setState: (
      partialStateOrRecipeCb: Partial<T> | ((mutable: Mutable<T>) => void),
      options?: ISetStateOptions<T>,
    ) => NextState<T>;
  }) => Promise<Partial<T>> | Partial<T> | void,
  ...args: A
) => Promise<NextState<T>>;

/**
 * 创建浅依赖收集的共享对象
 *
 * ```
 *  const [ state, setState, call ] = share({ a: 100, b: 2 });
 *  // state 可透传给 useSharedObject
 *  // setState 可以直接修改状态
 *  // call 可以调用服务函数，并透传上下文
 * 
 *  // share({ a: 100, b: 2 }, true); // 创建响应式状态
 *  // share({ a: 100, b: 2 }, 'demo'); // 指定模块名
 *  // share({ a: 100, b: 2 }, { moduleName: 'demo', enableReactive: true }); // 既指定模块名，也设定响应式为true
 *
 * ```
 *  以下将举例两种具体的调用方式
 * ```
 * // 调用服务函数第一种方式，直接调用定义的函数，配合 ret.setState 修改状态
 * function changeAv2(a: number, b: number) {
 *    ret.setState({ a, b });
 * }
 *
 * // 第二种方式，使用 ret.call(srvFn, ...args) 调用定义在call函数参数第一位的服务函数
 * function changeA(a: number, b: number) {
 *    ret.call(async function (ctx) { // ctx 即是透传的调用上下文，
 *      // args：使用 call 调用函数时透传的参数列表，state：状态，setState：更新状态句柄
 *      // 此处可全部感知到具体的类型
 *      // const { args, state, setState, draft } = ctx;
 *      return { a, b };
 *      // or
 *      draft.a = a;
 *      drqft.b = b;
 *      // or 混合使用
 *      draft.a = a;
 *      return { b };
 *    }, a, b);
 *  }
 * ```
 * 如需感知组件上下文，则需要`useService`接口去定义服务函数，可查看 useService 相关说明
 */
export function share<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType,
): [SharedObject<T>, SetState<T>, Call<T>]

export const createShared: typeof share; // for compatible wit v2 helux

export function shareState<T extends Dict = Dict>(
  rawState: T | (() => T),
  strBoolOrCreateOptions?: ICreateOptionsType,
): { state: SharedObject<T>, setState: SetState<T>, call: Call<T> }

/**
 * 以共享状态或其他计算结果为输入，创建计算函数
 * 需注意返回结果必须是
 * @param deriveFn
 * ```
 */
export function derive<T extends PlainObject = PlainObject>(deriveFn: (params: IFnParams) => T): T

/**
 *
 * @param sourceFn
 * @param deriveFn
 */
export function deriveAsync<S extends any = any, R extends Dict = Dict>(
  sourceFn: () => { source: S; initial: R },
  deriveFn: (taskParams: IAsyncTaskParams<S>) => Promise<R>,
): R

export function deriveTask<R extends PlainObject = PlainObject>(
  deriveFn: (taskParams: IFnParams) => {
    initial: R;
    task: () => Promise<R>;
  },
): R

export function watch(watchFn: (fnParams: IWatchFnParams) => void): void

/**
 * 使用共享对象，需注意此接口只接受共享对象，如传递普通对象给它会报错 OBJ_NOT_SHARED_ERR
 * ```ts
 * // 在组件外部其他地方创建共享对象
 * const sharedObj = createSharedObject({a:1, b:2});
 * // 然后在任意组件里使用即可
 * const [ obj, setObj ] = useSharedObject(sharedObj);
 * ```
 * @param sharedObject
 * @param enableReactive
 */
export function useShared<T extends Dict = Dict>(
  sharedObject: T | (() => T),
  enableReactive?: boolean,
): [SharedObject<T>, SetState<T>]


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
export function useObject<T extends Dict = Dict>(initialState: T | (() => T)): [T, (partialState: Partial<T>) => void]

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
export function useService<P extends Dict = Dict, S extends Dict = Dict, T extends Dict = Dict>(
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
}

/**
 * 强制更新
 */
export function useForceUpdate(): () => void

/**
 * 对齐 React.useEffect
 * 优化了调用逻辑，即 strict 模式与普通模式行为一致，只有一次 mount 与 unmount 产生
 * @param cb
 * @param deps
 */
export function useEffect(cb: EffectCb, deps?: any[]): void

/**
 * 对齐 React.useLayoutEffect
 * 优化了调用逻辑，即 strict 模式与普通模式行为一致，只有一次 mount 与 unmount 产生
 * @param cb
 * @param deps
 */
export function useLayoutEffect(cb: EffectCb, deps?: any[]): void
