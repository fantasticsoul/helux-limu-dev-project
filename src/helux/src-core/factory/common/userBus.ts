import { getRootCtx } from '../root';

export function getUserBus() {
  const { userBus } = getRootCtx();
  return userBus;
}

export function emit<A extends any[] = any[]>(name: string, ...args: A) {
  const { userBus } = getRootCtx();
  userBus.emit(name, ...args);
}
