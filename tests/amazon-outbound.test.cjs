const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('amazon-outbound.js', 'utf8');
function setup(mode) {
  let handler, timer, fetches = 0;
  const navigations = [], events = [], storage = new Map();
  const element = {dataset: {source: 'hq'}, addEventListener: (_, fn) => handler = fn, setAttribute(){}, removeAttribute(){}};
  const context = {
    document: {querySelectorAll: () => [element], getElementById: () => ({textContent:''})},
    location: {search: '?funnel_test=1', assign: url => navigations.push(url)},
    sessionStorage: {getItem: k => {if(mode==='storage') throw Error('blocked'); return storage.get(k)}, setItem: (k,v) => storage.set(k,v), removeItem:k=>storage.delete(k)},
    fetch: async () => {fetches++; if(mode==='hang') return new Promise(()=>{}); if(mode==='network') throw Error('offline'); return {ok: !(mode==='write' && fetches===2), json:async()=>({idToken:'test',expiresIn:'3600'})}},
    crypto: require('node:crypto').webcrypto, URLSearchParams,
    window: {dispatchEvent:e=>events.push(e)}, CustomEvent:class {constructor(type, args){this.type=type;this.detail=args.detail}},
    setTimeout: fn => {timer=fn;return 1}, clearTimeout(){}
  };
  vm.runInNewContext(source,context);
  return {click:props=>handler({button:0,preventDefault(){},...props}), timeout:()=>timer(), navigations, events, get fetches(){return fetches}};
}
for (const mode of ['success','network','storage','write','hang']) {
  test(`Amazon opens when measurement is ${mode}`,async()=>{
    const app=setup(mode), pending=app.click();
    if(mode==='hang') app.timeout();
    await pending;
    assert.deepEqual(app.navigations,['https://www.amazon.de/dp/B0H7KX8XF4']);
    if(mode==='success') {assert.equal(app.events.length,1);assert.equal(app.events[0].detail.test_event,true);}
    else assert.equal(app.events.length,0);
  });
}
test('modified clicks keep native browser behavior',async()=>{
  for(const props of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
    const app=setup('success'); await app.click({...props,preventDefault(){assert.fail('intercepted')}});
    assert.equal(app.fetches,0); assert.equal(app.navigations.length,0);
  }
});
test('double click opens Amazon once',async()=>{
  const app=setup('hang'), first=app.click(); await app.click(); app.timeout(); await first;
  assert.equal(app.navigations.length,1);
});
