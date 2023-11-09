import { getInternal } from '../../helpers/state';
import type { SharedState } from '../../types';
import type { TInternal } from '../creator/buildInternal';
import { tryAlert } from '../../utils';

export function checkShared<T = SharedState>(sharedState: T, label: string): TInternal {
  const internal = getInternal(sharedState);
  if (!internal) {
    tryAlert(`[[${label}]] err: not a valid shared state`, true);
  }
  return internal;
}
