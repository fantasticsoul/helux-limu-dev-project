import { IOperateParams } from 'limu';
import type { KeyIdsDict, NumStrSymbol } from '../../types';
import { nodupPush, prefixValKey, matchDictKey } from '../../utils';
import { getDepKeyByPath, IMutateCtx } from '../common/util';
import { cutDepKeyByStop } from '../common/stopDep';
import type { TInternal } from './buildInternal';

export function handleOperate(opParams: IOperateParams, opts: { internal: TInternal; mutateCtx: IMutateCtx }) {
  const { isChange, fullKeyPath, keyPath, parentType } = opParams;
  const { internal, mutateCtx } = opts;
  const { arrKeyDict } = mutateCtx;
  if (!isChange) {
    if (parentType === 'Array') {
      arrKeyDict[getDepKeyByPath(keyPath, internal.sharedKey)] = 1;
    }
    return;
  }

  const { moduleName, sharedKey, exact, ruleConf, level1ArrKeys } = internal;
  const writeKey = getDepKeyByPath(fullKeyPath, sharedKey);
  const { writeKeyPathInfo, ids, globalIds, writeKeys } = mutateCtx;
  const { idsDict, globalIdsDict, stopDepInfo } = ruleConf;

  writeKeyPathInfo[writeKey] = { sharedKey, moduleName, keyPath: fullKeyPath };

  // 设定了非精确更新策略时，提取出第一层更新路径即可
  if (!exact) {
    const keyPrefix = prefixValKey('', sharedKey); // as namespace
    const level1Key = `${keyPrefix}${fullKeyPath[0]}`;
    writeKeys[level1Key] = 1;
    return;
  }
  // 用户设定了精确更新策略，则只查当前更新路径的视图

  // 筛出当前写入 key 对应的可能存在的数组 key
  const arrKey = matchDictKey(arrKeyDict, writeKey);
  if (arrKey) {
    // 主动把数组key也记录下，因为数组对应视图通常都用 forEach 生成的
    // 然后遍历出来的孩子节点都会包一个 memo，所以需主动通知一下使用数组根节点的组件重渲染
    writeKeys[arrKey] = 1;
  }

  // 可能在 recordCb 里缩短后再记录
  const depKeyInfo = { sharedKey, keyPath: fullKeyPath, depKey: writeKey };
  if (
    !cutDepKeyByStop(depKeyInfo, { stopDepInfo, level1ArrKeys, recordCb: (key) => { writeKeys[key] = 1 } })
  ) {
    writeKeys[writeKey] = 1;
  }

  // 如果变化命中了 rules[].ids 或 globaIds 规则，则添加到 mutateCtx.ids 或 globalIds 里
  const putId = (keyIds: KeyIdsDict, ids: NumStrSymbol[]) => {
    // find update ids configured in rules
    Object.keys(keyIds).forEach((confKey) => {
      // writeKey: 1/a|list|0|name
      // confKey: 1/a|list
      if (writeKey.startsWith(confKey)) {
        keyIds[confKey].forEach((id) => nodupPush(ids, id));
      }
    });
  };
  putId(idsDict, ids);
  putId(globalIdsDict, globalIds);
}
