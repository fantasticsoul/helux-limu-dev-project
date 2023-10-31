export type PrimitiveItem = number | string;

export type PrimitiveSymItem = PrimitiveItem | symbol;

export type Dict<T extends any = any> = Record<PrimitiveSymItem, T>;

export type PlainObject = Record<string, {}>;

export type DictN<T extends any = any> = Record<number, T>;

export type Fn<T extends any = any> = (...args: any[]) => T;

export type SharedObject<T extends Dict = any> = T;

export type Mutable<T extends Dict = Dict> = T;

export type NextState<T extends Dict = Dict> = T;

export type Ext<T extends Dict = Dict> = T & { [key: string]: any };

export type EenableReactive = boolean;

export type DepCollectionWay = 'FIRST_RENDER' | 'EVERY_RENDER';

/** 是否在执行计算中，如是同步的计算结果，hook里此值总是 false，不会产生变化 */
export type IsComputing = boolean;

export interface IBaseCreateOptionsFull {
  /**
   * 模块名称，方便用户可以查看到语义化的状态树
   * 不传递的话内部会生成 symbol 作为 key
   * 传递的话如果重复了，目前的策略仅仅是做个警告，helux 内部始终以 symbol 作为模块的命名空间控制其他逻辑
   */
  moduleName: string;
}

export interface ICreateOptionsFull extends IBaseCreateOptionsFull {
  /**
   * default: false，是否创建响应式状态
   * ```
   * 响应式状态，即可直接通过给对象赋值来驱动视图渲染的模式（且支持对第一层key直接赋值才起作用）：`obj.a = 1`
   * 特别注意，此参数仅针对 isDeep=false 处于浅依赖收集模式的状态有效
   * 
   * true：创建响应式状态，false：创建非响应式状态
   * ```
   */
  enableReactive: EenableReactive;

  /** default: false，直接读取 sharedObj 时是否记录依赖，目前用于满足 helux-solid 库的需要，enableReactive 为 true 时 ，设置此参数才有意义 */
  enableRecordDep: boolean;
  /**
   * default: false，是否对传入进来的 obj 做浅拷贝
   * ```
   * const originalObj = { a:1, b: 2 };
   * const { state } = createShared(originalObj, { copyObj: true } );
   * // 若 copyObj === true, 则 getRawState(state) === originalObj 结果为 false
   * // 若 copyObj === false, 则 getRawState(state) === originalObj 结果为 true
   * ```
   */
  copyObj: boolean;
  /**
   * defaut: true, 修改的状态值是否同步到原始状态
   * 注意此参数仅在 copyObj=true 时设置才有意义
   * ```
   * const originalObj = { a:1, b: 2 };
   * const { state, setState } = createShared(originalObj);
   * // 为 true 时，任何 setState 调用都会同步到 originalObj 上
   * ```
   */
  enableSyncOriginal: boolean;
}

export interface ICreateDeepOptionsFull<T extends Dict = Dict> extends IBaseCreateOptionsFull {
  /**
   * default: false，是否使用精确更新策略
   * ```
   * 为 true 时，表示使用精确更新策略，此时相信用户用稳定方式去修改状态，helux 内部会使用深度依赖收集到的最长路径（即更新凭据）
   * 去更新视图，有助于缩小更新视图范围，达到更精确通知视图更新的目的，开启此设置需谨慎，确保开启后按约定使用稳定方式去修改状态，
   * 否则会造成冗余更新，具体原因见下面代码解释
   * ```
   * ```ts
   * // 如下为稳定方式更新，在 exact 为 true 时，会查 a1|b、a2|b|c、a2|b|e 这些依赖对应的视图更新
   * // exact 为 false 时，会查 a1、a1|b、a2、a2|b、a2|b|c、a2|b|e 这些依赖对应的视图更新
   * // 所以只要用户按约定一定使用稳定方式去修改状态的话，通知范围会减少
   * setState(draft=>{
   *  draft.a1.b = 1;
   *  draft.a2.b.c = 2
   *  draft.a2.b.e = 3
   * });
   * 
   * // 如下使用非稳定方式更新时，此时只会查 a2 去更新视图，则可能造成部分视图冗余更新
   * setState(draft=>{
   *  draft.a2 = { b: { ...draft.a2.b, c: 2, e: 3 } };
   * });
   * // 冗余更新的原因是，假如视图V1读的是 a2.b.f，它的依赖是 a2、a2|b、a2|b|f，
   * // 上面的更新语句其实只改了 a2.b.c  a2.b.e，但更新凭据是 a2，则也会通知V1更新
   * // 如果使用稳定更新方式，用最长路径去更新视图的话，更新路径是 a2|b|c  a2|b|e，则不同通知V1更新
   * ```
   */
  exact: boolean;
  /**
   * 配置状态变更联动视图更新的规则
   */
  rules: { when: (state: T) => any | void, ids: string[] }[];
}

// collectionWay: FIRST_RENDER EVERY_RENDER EVERY_RENDER_MERGE
export interface IUseSharedOptions<T extends Dict = Dict> {
  /**
   * 依赖收集方式
   */
  depCollectionWay?: DepCollectionWay;
  /**
   * 组件的静态依赖，，一旦设置后当前组件的依赖收集行为将关闭，请慎用此设置
  */
  staticDeps?: (readOnlyState: T) => (any[] | void);
  /**
   * 除了收集到的依赖之外，补充的额外依赖项，如果设置 staticDeps 则此设置无效
   */
  extraDeps?: (readOnlyState: T) => (any[] | void);
  /**
   * 视图的id，在 ICreateDeepOptionsFull.rules 里配置更新的ids使用的就是此处的id
   */
  id?: string;
  enableReactive?: boolean;
}

export interface ISetStateOptions<T extends Dict = Dict> {
  /**
   * 除了 setState 方法里收集的状态变化依赖之外，额外追加的变化依赖，适用于没有某些状态值无改变也要触发视图渲染的场景
   */
  extraDeps?: (readOnlyState: T) => (any[] | void);
  /**
   * 需要排除掉的依赖，因内部先执行 extraDeps 再执行 excludeDeps，所以 excludeDeps 也能排除掉 extraDeps 追加的依赖
   */
  excludeDeps?: (readOnlyState: T) => (any[] | void);
}

export type InnerCreateOptions = {
  /** use deep dependency collection strategy */
  isDeep: boolean;
} & ICreateDeepOptionsFull & ICreateOptionsFull;

export type ICreateOptions = Partial<ICreateOptionsFull>;

export type ICreateDeepOptions<T extends Dict = Dict> = Partial<ICreateDeepOptionsFull<T>>;

export type ModuleName = string;

export type TriggerReason = { sharedKey: number; moduleName: string; keyPath: string[] };

export type ICreateOptionsType = ModuleName | EenableReactive | ICreateOptions;

export type CleanUpCb = () => void;

export type EffectCb = () => void | CleanUpCb;

export interface IWatchFnParams {
  isFirstCall: boolean;
}

export interface IFnParams<T extends PlainObject = PlainObject> {
  isFirstCall: boolean;
  prevResult: T | null;
}

export interface IAsyncTaskParams<S extends any = any> extends IFnParams {
  source: S;
}

export type DerivedResult<T extends Dict = Dict> = T;

export type DerivedFn<T extends Dict = Dict> = (params: IFnParams) => T;

export interface IUnmountInfo {
  t: number;
  /** mount count, 第一次挂载或第二次挂载 */
  c: 1 | 2;
  /**
   * @deprecated
   * 前一个实例 id，已无意义，后续会移除
   */
  prev: number;
}

export type FnType = 'watch' | 'derive';

export type ScopeType = 'static' | 'hook';

export type AsyncType = 'source' | 'task' | 'normal';

export type ReanderStatus = '1' | '2';

export type MountStatus = 1 | 2 | 3;

export interface IFnCtx {
  /**
   * 计算函数本体，即透传给 derive 的回调函数
   */
  fn: Fn;
  /**
   * 函数唯一标记 key
   */
  fnKey: string;
  /**
   *  deriveAsync/useDeriveAsync 传入的第一个回调函数
   */
  sourceFn: Fn;
  /**
   * default: true，是否是处于第一层的函数，使用了其他计算结果时就会表标记为 false
   */
  isFirstLevel: boolean;
  isComputing: boolean;
  remainRunCount: number;
  careDeriveStatus: boolean;
  /**
   * default: false ，是否对计算结果开启记录读依赖功能，此功能仅针对 hook 里使用 useDerived 有效
   */
  enableRecordResultDep: boolean;
  /**
   * 直接依赖此函数的下一层函数列表，如其他函数使用了此函数的返回结果（包括中转返回结果），则它们的 key 会被记录到这里
   */
  nextLevelFnKeys: string[];
  /** 此函数依赖的上一层函数列表，如此函数内部使用了其他函数的返回结果，则把其他函数的 key 会被记录到这里 */
  prevLevelFnKeys: string[];
  /** 未挂载 已挂载 已卸载 */
  mountStatus: MountStatus;
  depKeys: string[];
  /** 依赖的共享状态集合 */
  depSharedKeys: number[];
  /**
   * 计算函数返回的原始结果，总是指向第一次计算返回的结果
   */
  result: PlainObject<any>;
  /**
   * 提供给 hook 函数读取的代理结果
   */
  proxyResult: PlainObject<any>;
  fnType: FnType;
  scopeType: ScopeType;
  /** work for hook derived fnCtx */
  updater: Fn;
  /** work for hook derived fnCtx */
  isResultReaded: boolean;
  /** 只要结果曾经读取过就记录为 true */
  isResultReadedOnce: boolean;
  /** 热更新模式下，标记当前 fnCtx 是否已过期 */
  isExpred: boolean;
  /**
   * 是否返回了上游的计算结算，方便为计算结果中转机制服务
   * work for derived result transfer mechanism
   */
  returnUpstreamResult: boolean;
  /** work for hook derived fnCtx */
  renderStatus: ReanderStatus;
  /** fn ctx created timestamp */
  createTime: number;
  /** work for hook derived fnCtx  */
  shouldReplaceResult: boolean;
  /**
   * 是否是异步的计算函数，使用了异步计算结果、返回了异步计算结果、返回了 asyncTask，满足任意一种情况都会标记为 true
   */
  isAsync: boolean;
  /** 是否是一个中转结果的异步函数，内部用的标记 */
  isAsyncTransfer: boolean;
  asyncType: AsyncType;
  subscribe: Fn;
}

export interface IInsCtx<T extends Dict = Dict> {
  /** 当前渲染完毕所依赖的 key 记录 */
  readMap: Dict;
  /** 上一次渲染完毕所依赖的 key 记录 */
  readMapPrev: Dict;
  /** StrictMode 下辅助 resetDepMap 函数能够正确重置 readMapPrev 值 */
  readMapStrict: null | Dict;
  /** 是否是深度依赖收集模式 */
  isDeep: boolean;
  insKey: number;
  internal: T;
  rawState: Dict;
  sharedState: Dict;
  proxyState: Dict;
  setState: Fn;
  /** 未挂载 已挂载 已卸载 */
  mountStatus: MountStatus;
  renderStatus: ReanderStatus;
  /** ins ctx created timestamp */
  createTime: number;
  /** adapt to react 18 useSyncExternalStore */
  subscribe: Fn;
  /** 实例读取数据对应的版本号 */
  ver: number;
  id: string;
  /** 能否收集依赖 */
  canCollect: boolean;
  /** 是否有静态依赖 */
  hasStaticDeps: boolean;
}

export interface ICreateDerivedLogicOptions {
  careDeriveStatus?: boolean;
  scopeType?: ScopeType;
  fnCtxBase?: IFnCtx;
  allowTransfer?: boolean;
  runAsync?: boolean;
  asyncType?: AsyncType;
  returnUpstreamResult?: boolean;
}

export interface IHeluxParams {
  /**
   * 一个标识了 sharedKey 的普通json对象，可以作为一个始终可以获取到最新值的稳定引用
   */
  markedState: Dict;
  rawState: Dict;
  shouldSync: boolean;
  sharedKey: number;
  moduleName: string;
  createOptions: InnerCreateOptions;
}
