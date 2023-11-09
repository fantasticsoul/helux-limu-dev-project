import { IOperateParams } from 'limu';
import type { KeyIdsDict, NumStrSymbol } from '../../types';
import { nodupPush, prefixValKey } from '../../utils';
import { getArrKey, getDepKeyByPath, IMutateCtx, recordDataKeyByStop } from '../common/util';
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

  const { moduleName, sharedKey, parsedOptions, ruleConf } = internal;
  const writeKey = getDepKeyByPath(fullKeyPath, sharedKey);
  const { writeKeyPathInfo, ids, globalIds, writeKeys } = mutateCtx;
  const { idsDict, globalIdsDict, stopDepInfo } = ruleConf;

  writeKeyPathInfo[writeKey] = { sharedKey, moduleName, keyPath: fullKeyPath };

  // 设定了非精确更新策略时，提取出第一层更新路径即可
  if (!parsedOptions.exact) {
    const keyPrefix = prefixValKey('', sharedKey); // as namespace
    const level1Key = `${keyPrefix}${fullKeyPath[0]}`;
    writeKeys[level1Key] = 1;
    return;
  }
  // 用户设定了精确更新策略，则只查当前更新路径的视图

  const arrKey = getArrKey(writeKey, arrKeyDict);
  if (arrKey) {
    // 主动把数组key也记录下，因为数组对应视图通常都用 forEach 生成的
    // 然后遍历出来的孩子节点都会包一个 memo，所以需主动通知一下使用数组根节点的组件重渲染
    writeKeys[arrKey] = 1;
  }
  // 可能会缩短后再记录
  if (
    !recordDataKeyByStop(writeKey, stopDepInfo, (key) => {
      writeKeys[key] = 1;
    })
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
