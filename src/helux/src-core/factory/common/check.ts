import { getInternal } from '../../helpers/state';
import type { SharedState } from '../../types';
import type { TInternal } from '../creator/buildInternal';
import { tryAlert } from '../../utils';

export function checkShared<T = SharedState>(sharedState: T, forAtom: boolean, label: string): TInternal {
  const internal = getInternal(sharedState);
  if (!internal) {
    tryAlert(`[[${label}]] err: not a valid shared or atom`, true);
  }
  if (forAtom && !internal.forAtom) {
    tryAlert(`[[${label}]] err: expect for a shared but recived a atom`, true);
  }
  if (!forAtom && internal.forAtom) {
    tryAlert(`[[${label}]] err: expect for a atom but recived a shared`, true);
  }
  return internal;
}
