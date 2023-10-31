
let seed = 0;

/**
 * get num seed
 */
export function getSeed() {
  seed += 1;
  return seed;
}

export function random(seed = 100) {
  return Math.ceil(Math.random() * seed);
}

export const delay = (ms = 2000) => new Promise(r => setTimeout(r, ms));

export function nodupPush(list: Array<string | number>, toPush: string | number) {
  if (!list.includes(toPush)) list.push(toPush);
}

export function timemark() {
  const date = new Date();
  const str = date.toLocaleString();
  const [, timeStr] = str.split(' ');
  const ms = date.getMilliseconds();
  return `${timeStr} ${ms}`;
}

export function bindToWindow(obj: any) {
  // @ts-ignore
  if (!window.see) window.see = {};
  // @ts-ignore
  Object.assign(window.see, obj);
}
