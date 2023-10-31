import { safeGet, nodupPush, delListItem } from '../../utils';
import type { Fn, IHeluxParams, IInsCtx } from '../../types';

export function buildInternal(
  heluxParams: IHeluxParams,
  options: {
    setState: Fn;
    insCtxMap: Map<number, IInsCtx>;
    key2InsKeys: Record<string, number[]>;
    id2InsKeys: Record<string, number[]>;
    writeKey2Ids: Record<string, string[]>;
    isDeep: boolean;
  },
) {
  const { markedState, sharedKey, moduleName, createOptions, shouldSync } = heluxParams;
  const { setState, insCtxMap, key2InsKeys, id2InsKeys, writeKey2Ids, isDeep } = options;

  return {
    rawState: markedState, // helux raw state
    rawStateSnap: markedState, // will be replaced after changing state
    ver: 0,
    sharedKey,
    moduleName,
    key2InsKeys,
    insCtxMap,
    id2InsKeys,
    writeKey2Ids,
    isDeep,
    createOptions,
    shouldSync,
    setState,
    recordId(insKey: number, id?: string) {
      if (!id) return;
      const insKeys: any[] = safeGet(id2InsKeys, id, []);
      nodupPush(insKeys, insKey);
    },
    delId(insKey: number, id?: string) {
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
    mapInsCtx(insKey: number, insCtx: IInsCtx) {
      insCtxMap.set(insKey, insCtx);
    },
    delInsCtx(insKey: number) {
      insCtxMap.delete(insKey);
    },
  };
}

export type TInternal = ReturnType<typeof buildInternal>;

export type InsCtxDef = IInsCtx<TInternal>;
