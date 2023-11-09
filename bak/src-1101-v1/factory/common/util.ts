import type { IOperateParams } from 'limu';
import { KEY_SPLITER } from '../../consts';
import { prefixValKey, isDebug } from '../../utils';
import type { Dict, IRuleConf, ISetStateOptions, TriggerReason, NumStrSymbol } from '../../types';

export interface IMutateCtx {
  depKeys: string[];
  triggerReasons: TriggerReason[];
  ids: NumStrSymbol[];
  globalIds: NumStrSymbol[];
  writeKeys: Dict;
  arrKeyDict: Dict;
  writeKeyPathInfo: Dict<TriggerReason>;
  /** TODO ：记录变化值的路径，用于异步执行环境合并到 rawState 时，仅合并变化的那一部分节点，避免数据脏写 */
  keyPathValue: Map<string[], any>;
}

// for hot reload of buildShared
export function tryGetLoc(moduleName: string, startCutIdx = 4) {
  let loc = '';
  if (isDebug() && moduleName) {
    try {
      throw new Error('loc');
    } catch (err: any) {
      loc = err.stack.split('\n').slice(startCutIdx, 8).join('|');
      console.log(loc);
    }
  }
  return loc;
}

export function newMutateCtx(options: ISetStateOptions): IMutateCtx {
  const { ids = [], globalIds = [] } = options; // 用户 setState 可能设定了 ids globalIds
  return {
    depKeys: [],
    triggerReasons: [],
    ids,
    globalIds,
    writeKeys: {},
    arrKeyDict: {}, // 记录读取过程中遇到的数组key
    writeKeyPathInfo: {},
    keyPathValue: new Map(),
  };
}

export function newOpParams(key: string, value: any): IOperateParams {
  return { isChange: true, op: 'set', key, value, parentType: 'Object', keyPath: [], fullKeyPath: [key], isBuiltInFnKey: false };
}


/**
 * fullKey: 0/a|b|list|2|key1|key2
 * confKey: 0/a|b|list
 * result:  0/a|b|list|2
 */
export function getArrIndexKey(confKey: string, fullKey: string) {
  if (confKey === fullKey) {
    return confKey;
  }
  const restStr = fullKey.substring(confKey.length + 1);
  const keys = restStr.split(KEY_SPLITER);
  return `${confKey}${KEY_SPLITER}${keys[0]}`
}

/**
 * 尝试查询当前 readKey writeKey 是否需要缩短后再记录
 */
export function recordDataKeyForStop(readOrWriteKey: string, stopDepInfo: IRuleConf['stopDepInfo'], recordCb: (key: string) => void) {
  let isKeyRerord = false;
  const { keys: stopDepKeys, isArrDict } = stopDepInfo;
  for (const confKey of stopDepKeys) {
    if (!readOrWriteKey.startsWith(confKey)) {
      continue;
    }

    // 是数组结构，带数组下标后缀的 key 给recordCb记录，否则传当前配置 key
    const recordKey = isArrDict[confKey] ? getArrIndexKey(confKey, readOrWriteKey) : confKey;
    recordCb(recordKey);
    isKeyRerord = true;
    break;
  }
  return isKeyRerord;
}

/**
 * 筛出当前写入 key 对应的可能存在的数组 key
 */
export function getArrKey(writeKey: string, arrKeyDict: Dict) {
  let arrKey = '';
  for (const key in arrKeyDict) {
    if (writeKey.startsWith(key)) {
      arrKey = key;
      break;
    }
  }
  return arrKey;
}


export function getDepKeyByPath(fullKeyPath: string[], sharedKey: number) {
  return prefixValKey(fullKeyPath.join(KEY_SPLITER), sharedKey);
}
