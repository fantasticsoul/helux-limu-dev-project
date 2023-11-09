import type {
  AsyncSetState,
  Fn,
  IInsCtx,
  InsCtxMap,
  IRuleConf,
  KeyInsKeysDict,
  NumStrSymbol,
  SetAtom,
  SetState,
  SharedState,
  InnerSetState,
  IInnerCreateOptions,
  MutateFnItem,
  AtomMutateFnItem,
  Dict,
} from '../../types';
import { delListItem, nodupPush, safeGet, noop } from '../../utils';
import { ParsedOptions } from './parse';

/** 在 initLoadingCtx 阶段会生成，这里先预备一个假的 */
const fakeInternal: any = { setState: noop };

export function buildInternal(
  parsedOptions: ParsedOptions,
  options: {
    setAtom: SetAtom;
    setState: SetState;
    /** 这个函数指向正确的 set 句柄，无需判断是 atom 还是 shared */
    setDraft: SetAtom | SetState;
    asyncSetState: AsyncSetState;
    innerSetState: InnerSetState;
    setStateImpl: (...any: any[]) => { draft: any; finishMutate: Fn; getPartial: Fn };
    sharedState: SharedState;
    insCtxMap: InsCtxMap;
    key2InsKeys: KeyInsKeysDict;
    id2InsKeys: KeyInsKeysDict;
    ruleConf: IRuleConf;
    isDeep: boolean;
    mutate: IInnerCreateOptions['mutate'];
    before: IInnerCreateOptions['before'];
    mutateFns: MutateFnItem[];
    loc: string;
    syncer: any;
    sync: any;
    forAtom: boolean;
    loadingMode: string;
    stateType: string;
  },
) {
  const { rawState, sharedKey, moduleName, usefulName } = parsedOptions;
  const { id2InsKeys, key2InsKeys, insCtxMap } = options;

  return {
    rawState: rawState, // helux raw state
    rawStateSnap: rawState, // will be replaced after changing state
    ver: 0,
    sharedKey,
    moduleName,
    usefulName,
    parsedOptions,
    ...options,
    recordId(id: NumStrSymbol, insKey: number) {
      if (!id) return;
      const insKeys: any[] = safeGet(id2InsKeys, id, []);
      nodupPush(insKeys, insKey);
    },
    delId(id: NumStrSymbol, insKey: number) {
      if (!id) return;
      delListItem(id2InsKeys[id] || [], insKey);
    },
    recordDep(depKey: string, insKey: number) {
      const insKeys: any[] = safeGet(key2InsKeys, depKey, []);
      nodupPush(insKeys, insKey);
    },
    delDep(depKey: string, insKey: number) {
      delListItem(key2InsKeys[depKey] || [], insKey);
    },
    mapInsCtx(insCtx: IInsCtx, insKey: number) {
      insCtxMap.set(insKey, insCtx);
    },
    delInsCtx(insKey: number) {
      insCtxMap.delete(insKey);
    },
    extra: {}, // 记录一些需复用的中间生成的数据
    loadingInternal: fakeInternal,
    outMutateFnDict: {} as Dict<MutateFnItem | AtomMutateFnItem>,
  };
}

export type TInternal = ReturnType<typeof buildInternal>;

export type InsCtxDef = IInsCtx<TInternal>;
