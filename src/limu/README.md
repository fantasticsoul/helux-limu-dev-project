limu source

```ts

var a = new Proxy({}, {
  defineProperty(target, key, desc) {
    console.log('start call');  
    desc.value(222);
    return true;
  },
});

// getMeta without apiCtx
let val = 0;
const FOR_META = Symbole('ForMeta');
const r = Object.defineProperty(a, FOR_META, { value: (metaVer) => {
  val = metaVer;
} });
console.log('val is ', val);

```