let symbolSeed = 0;
const NativeSym = Symbol;
const hasSym = typeof NativeSym === 'function';

export function createSymbol(str: string) {
  if (hasSym) {
    return NativeSym(str);
  }

  symbolSeed += 1;
  return `__SHARED_KEY__${symbolSeed}`;
}
