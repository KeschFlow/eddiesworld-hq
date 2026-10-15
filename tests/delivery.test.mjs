import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../delivery/worker.mjs';

function fixture() {
  let clock=1000, gets=0;
  const product={price:'price_calendar',product:'prod_calendar',amount:490,currency:'eur',key:'calendar.pdf'};
  const env={STRIPE_SECRET_KEY:'sk_test_fixture_only',DOWNLOAD_SIGNING_KEY:'fixture-signing-key-not-for-real-use-123456',DELIVERY_MODE:'test',
    DELIVERY_PRODUCTS:JSON.stringify({calendar:product,tracker:{...product,price:'price_tracker',product:'prod_tracker',key:'tracker.pdf'}}),
    PRODUCT_FILES:{head:async()=>({}),get:async()=>{gets++;return {body:new TextEncoder().encode('%PDF-fixture')}}}};
  const session={id:'cs_test_fixture123',livemode:false,mode:'payment',status:'complete',payment_status:'paid',amount_total:490,currency:'eur',payment_intent:'pi_fixture'};
  const items={has_more:false,data:[{quantity:1,amount_total:490,price:{id:'price_calendar',product:'prod_calendar',unit_amount:490,currency:'eur',type:'one_time'}}]};
  const intent={id:'pi_fixture',livemode:false,status:'succeeded',amount:490,amount_received:490,currency:'eur',latest_charge:'ch_fixture'};
  const charge={id:'ch_fixture',payment_intent:'pi_fixture',livemode:false,status:'succeeded',paid:true,captured:true,amount:490,amount_captured:490,currency:'eur',refunded:false,amount_refunded:0,disputed:false};
  let offline=false;
  const fetcher=async url=>{
    if(offline)throw Error('offline');
    const data=url.includes('/line_items')?items:url.includes('/checkout/sessions/')?session:url.includes('/payment_intents/')?intent:charge;
    return Response.json(data);
  };
  const handler=createHandler({fetcher,now:()=>clock});
  const call=(action,body,options={})=>handler(new Request('https://shop.example/api/delivery/'+action,{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json',...options.headers},body:JSON.stringify(body)}),env);
  return {env,session,items,intent,charge,call,get gets(){return gets},advance:seconds=>clock+=seconds,offline:()=>offline=true};
}
const request={product:'calendar',session:'cs_test_fixture123'};
async function token(f){const response=await f.call('authorize',request);assert.equal(response.status,200);return (await response.json()).token;}

test('paid test session: private PDF; reuse allowed during five-minute lifetime',async()=>{
 const f=fixture();const value=await token(f);
 for(let i=0;i<2;i++){const r=await f.call('download',{token:value});assert.equal(r.status,200);assert.equal(await r.text(),'%PDF-fixture');assert.equal(r.headers.get('Cache-Control'),'no-store');}
 assert.equal(f.gets,2);
});
for(const [name,mutate] of [
 ['abandoned',f=>f.session.status='open'],['failed',f=>f.session.payment_status='unpaid'],
 ['wrong product',f=>f.items.data[0].price.product='prod_other'],['wrong price',f=>f.items.data[0].price.id='price_other'],
 ['wrong amount',f=>f.session.amount_total=1],['wrong currency',f=>f.session.currency='usd'],
 ['live session',f=>f.session.livemode=true],['wrong quantity',f=>f.items.data[0].quantity=2],
 ['more items',f=>f.items.has_more=true],['intent canceled',f=>f.intent.status='canceled'],
 ['refunded',f=>f.charge.refunded=true],['partial refund',f=>f.charge.amount_refunded=1],
 ['disputed',f=>f.charge.disputed=true],['uncaptured',f=>f.charge.captured=false],
 ['Stripe unavailable',f=>f.offline()],['missing file',f=>f.env.PRODUCT_FILES.head=async()=>null],
 ['live secret',f=>f.env.STRIPE_SECRET_KEY='sk_live_fixture'],['missing secret',f=>delete f.env.DOWNLOAD_SIGNING_KEY],
 ['same product mapping',f=>{const p=JSON.parse(f.env.DELIVERY_PRODUCTS);p.tracker=p.calendar;f.env.DELIVERY_PRODUCTS=JSON.stringify(p)}]
]) test(`rejects ${name}`,async()=>{const f=fixture();mutate(f);assert.equal((await f.call('authorize',request)).status,403);assert.equal(f.gets,0)});

test('expired and tampered tokens rejected',async()=>{const f=fixture(),value=await token(f);assert.equal((await f.call('download',{token:'x'+value})).status,403);f.advance(300);assert.equal((await f.call('download',{token:value})).status,403);assert.equal(f.gets,0)});
test('refund after authorization invalidates token',async()=>{const f=fixture(),value=await token(f);f.charge.amount_refunded=1;assert.equal((await f.call('download',{token:value})).status,403);assert.equal(f.gets,0)});
test('bare requests, unknown product and live session references are denied',async()=>{const f=fixture();for(const body of [{},{...request,product:'other'},{...request,session:'cs_live_fixture123'}])assert.equal((await f.call('authorize',body)).status,403);assert.equal((await f.call('download',{})).status,403)});
test('cross-origin request denied',async()=>{const f=fixture();assert.equal((await f.call('authorize',request,{headers:{Origin:'https://other.example'}})).status,403)});
test('bare GET cannot authorize or download',async()=>{const f=fixture();const h=createHandler();for(const route of ['authorize','download'])assert.equal((await h(new Request('https://shop.example/api/delivery/'+route),f.env)).status,405)});
test('tracker session authorizes only tracker file',async()=>{
 const f=fixture();f.items.data[0].price.id='price_tracker';f.items.data[0].price.product='prod_tracker';
 const response=await f.call('authorize',{...request,product:'tracker'});assert.equal(response.status,200);
 const {token:value}=await response.json();const download=await f.call('download',{token:value});assert.equal(download.status,200);
 assert.equal(download.headers.get('Content-Disposition'),'attachment; filename="tracker.pdf"');
 assert.equal((await f.call('authorize',request)).status,403);
});
