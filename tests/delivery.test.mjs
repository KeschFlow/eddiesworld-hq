import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../delivery/worker.mjs';

function fixture({mode = 'live'} = {}) {
  let gets = 0;
  const live = mode === 'live';
  const amount = 666;
  const sessionId = live ? 'cs_live_calendar123' : 'cs_test_calendar123';
  const product = {price:'price_calendar_fixture', product:'prod_calendar_fixture', amount, currency:'eur', key:'calendar.pdf'};
  const tracker = {price:'price_tracker_fixture', product:'prod_tracker_fixture', amount:490, currency:'eur', key:'tracker.pdf'};
  const env = {
    DELIVERY_MODE:mode,
    STRIPE_SECRET_KEY:live ? 'sk_live_fixture_only' : 'sk_test_fixture_only',
    DOWNLOAD_SIGNING_KEY:'fixture-signing-key-not-for-real-use-123456',
    DELIVERY_PRODUCTS:JSON.stringify({calendar:product, tracker}),
    PRODUCT_FILES:{
      head:async key => key === product.key ? {key} : null,
      get:async key => { if (key !== product.key) return null; gets++; return {body:new TextEncoder().encode('%PDF-fixture')}; }
    }
  };
  const session = {id:sessionId, livemode:live, mode:'payment', status:'complete', payment_status:'paid', amount_total:amount, currency:'eur', payment_intent:'pi_calendar_fixture'};
  const items = {has_more:false, data:[{quantity:1, amount_total:amount, price:{id:product.price, product:product.product, unit_amount:amount, currency:'eur', type:'one_time'}}]};
  const intent = {id:'pi_calendar_fixture', livemode:live, status:'succeeded', amount, amount_received:amount, currency:'eur', latest_charge:'ch_calendar_fixture'};
  const charge = {id:'ch_calendar_fixture', payment_intent:intent.id, livemode:live, status:'succeeded', paid:true, captured:true, amount, amount_captured:amount, currency:'eur', refunded:false, amount_refunded:0, disputed:false};
  const fetcher = async input => {
    const url = String(input);
    let data;
    if (url.includes('/line_items')) data = items;
    else if (url.includes('/checkout/sessions/')) data = session;
    else if (url.includes('/payment_intents/')) data = intent;
    else if (url.includes('/charges/')) data = charge;
    else throw new Error('Unexpected mocked Stripe URL');
    return Response.json(data);
  };
  const handler = createHandler({fetcher, now:() => 1000});
  const call = (action, body, {method='POST', headers={}}={}) => handler(new Request(`https://shop.example/api/delivery/${action}`, {
    method,
    headers:{Origin:'https://shop.example', 'Content-Type':'application/json', ...headers},
    ...(method === 'POST' ? {body:JSON.stringify(body)} : {})
  }), env);
  return {env, session, items, intent, charge, call, get gets() { return gets; }, sessionId};
}

test('live calendar payment for exactly EUR 6.66 authorizes and serves private PDF', async () => {
  const f = fixture();
  const authorization = await f.call('authorize', {product:'calendar', session:f.sessionId});
  assert.equal(authorization.status, 200);
  const {token} = await authorization.json();
  const download = await f.call('download', {token});
  assert.equal(download.status, 200);
  assert.equal(await download.text(), '%PDF-fixture');
  assert.equal(download.headers.get('Cache-Control'), 'no-store');
  assert.equal(download.headers.get('Content-Type'), 'application/pdf');
  assert.equal(f.gets, 1);
});

test('test and live configurations remain mode-separated; tracker remains EUR 4.90', async () => {
  const testMode = fixture({mode:'test'});
  assert.equal((await testMode.call('authorize', {product:'calendar', session:testMode.sessionId})).status, 200);
  testMode.env.STRIPE_SECRET_KEY = 'sk_live_mismatched_fixture';
  assert.equal((await testMode.call('authorize', {product:'calendar', session:testMode.sessionId})).status, 403);

  const liveMode = fixture();
  const config = JSON.parse(liveMode.env.DELIVERY_PRODUCTS);
  assert.equal(config.calendar.amount, 666);
  assert.equal(config.tracker.amount, 490);
  liveMode.env.STRIPE_SECRET_KEY = 'sk_test_mismatched_fixture';
  assert.equal((await liveMode.call('authorize', {product:'calendar', session:liveMode.sessionId})).status, 403);
});

test('rejects a calendar payment for the wrong amount', async () => {
  const f = fixture();
  f.session.amount_total = 665;
  assert.equal((await f.call('authorize', {product:'calendar', session:f.sessionId})).status, 403);
  assert.equal(f.gets, 0);
});

test('rejects missing, incomplete, unpaid, or unsuccessful payment', async t => {
  for (const [label, change] of [
    ['missing session', f => { f.session.id = 'cs_live_another123'; }],
    ['incomplete checkout', f => { f.session.status = 'open'; }],
    ['unpaid checkout', f => { f.session.payment_status = 'unpaid'; }],
    ['unsuccessful intent', f => { f.intent.status = 'processing'; }]
  ]) {
    await t.test(label, async () => {
      const f = fixture();
      change(f);
      assert.equal((await f.call('authorize', {product:'calendar', session:f.sessionId})).status, 403);
      assert.equal(f.gets, 0);
    });
  }
});

test('rejects a refunded charge and revokes an already-issued download token', async () => {
  const f = fixture();
  const authorization = await f.call('authorize', {product:'calendar', session:f.sessionId});
  assert.equal(authorization.status, 200);
  const {token} = await authorization.json();
  f.charge.refunded = true;
  f.charge.amount_refunded = 666;
  assert.equal((await f.call('download', {token})).status, 403);
  assert.equal(f.gets, 0);
});

test('denies unauthorized PDF access without reading the private R2 object', async () => {
  const f = fixture();
  assert.equal((await f.call('download', {})).status, 403);
  assert.equal((await f.call('download', {token:'forged.token'})).status, 403);
  assert.equal((await f.call('download', {}, {method:'GET'})).status, 405);
  assert.equal(f.gets, 0);
});

test('rejects wrong mode, wrong product, partial refund, and dispute', async t => {
  for (const [label, change] of [
    ['test-mode session in live mode', f => { f.session.livemode = false; }],
    ['different product', f => { f.items.data[0].price.product = 'prod_unapproved'; }],
    ['partial refund', f => { f.charge.amount_refunded = 1; }],
    ['disputed charge', f => { f.charge.disputed = true; }]
  ]) {
    await t.test(label, async () => {
      const f = fixture();
      change(f);
      assert.equal((await f.call('authorize', {product:'calendar', session:f.sessionId})).status, 403);
      assert.equal(f.gets, 0);
    });
  }
});
