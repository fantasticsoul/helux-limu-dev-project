import type {
  AsyncSetState,
  Fn,
  IInsCtx,
  IRuleConf,
  KeyInsKeysDict,
  NumStrSymbol,
  SetAtom,
  SetState,
  SharedState,
  InnerSetState,
  MutateFnItem,
  AtomMutateFnItem,
  Dict,
} from '../../types';
import type { Level1ArrKeys } from '../../types-inner';
import { delListItem, nodupPush, safeGet, noop } from '../../utils';
import { ParsedOptions } from './parse';

/** 在 initLoadingCtx 阶段会生成，这里先预备一个假的 */
const fakeInternal: any = { setState: noop };

export function buildInternal(
  parsedOptions: ParsedOptions,
  innerOptions: {
    setAtom: SetAtom;
    setState: SetState;
    /** 这个函数指向正确的 set 句柄，无需判断是 atom 还是 shared */
    setDraft: SetAtom | SetState;
    asyncSetState: AsyncSetState;
    innerSetState: InnerSetState;
    setStateImpl: (...any: any[]) => { draft: any; finishMutate: Fn; getPartial: Fn };
    sharedState: SharedState;
    ruleConf: IRuleConf;
    isDeep: boolean;
    syncer: any;
    sync: any;
  },
) {
  const { rawState } = parsedOptions;
  const insCtxMap = new Map<number, InsCtxDef>();
  const key2InsKeys: KeyInsKeysDict = {};
  // id --> insKeys
  const id2InsKeys: KeyInsKeysDict = {};
  const level1ArrKeys: Level1ArrKeys = [];

  return {
    ver: 0,
    rawStateSnap: rawState, // will be replaced after changing state
    ...parsedOptions,
    ...innerOptions,
    insCtxMap,
    key2InsKeys,
    id2InsKeys,
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
    mapInsCtx(insCtx: InsCtxDef, insKey: number) {
      insCtxMap.set(insKey, insCtx);
    },
    delInsCtx(insKey: number) {
      insCtxMap.delete(insKey);
    },
    extra: {}, // 记录一些需复用的中间生成的数据
    loadingInternal: fakeInternal,
    outMutateFnDict: {} as Dict<MutateFnItem | AtomMutateFnItem>,
    level1ArrKeys,
  };
}

export type TInternal = ReturnType<typeof buildInternal>;

export type InsCtxDef = IInsCtx<TInternal>;
