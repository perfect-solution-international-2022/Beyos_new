const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/delivery-offer.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exported = {};
new Function('exports', source)(exported);
const { DEFAULT_DELIVERY_OFFER: offer, deliveryOfferQuote: quote, validateDeliveryOffer: validate } = exported;
const items = quantity => [{ slug: 'tee', quantity }];
for (const channel of ['website','pos','reseller']) test(`${channel}: unit quantity determines delivery`, () => {
  for (const [quantity, fee] of [[1,350],[2,200],[3,0],[4,0],[20,0]]) assert.equal(quote(offer,channel,items(quantity),500).fee, fee);
});
test('mixed products and variants count as units, not cart rows', () => assert.equal(quote(offer,'website',[{slug:'tee',quantity:2},{slug:'other',quantity:1}],500).fee,0));
test('empty/pickup orders do not apply an offer', () => assert.deepEqual(quote(offer,'pos',[],0), {fee:0,offerName:null,quantity:0}));
test('disabled, scheduled, expired and excluded channels use ordinary shipping', () => {
  const now = Date.parse('2026-09-07T00:00:00Z');
  for (const changes of [{enabled:false},{channels:['website']},{startDate:'2026-09-08T00:00:00Z'},{endDate:'2026-09-07T00:00:00Z'}]) assert.equal(quote({...offer,...changes},'pos',items(3),650,now).fee,650);
  assert.equal(quote({...offer,startDate:'2026-09-07T00:00:00Z'},'pos',items(3),650,now).fee,0);
});
test('only selected products count; mixed-cart fee covers entire order', () => {
  const selected = {...offer,productSlugs:['tee']};
  assert.equal(quote(selected,'reseller',[{slug:'tee',quantity:2},{slug:'other',quantity:8}],650).fee,200);
  assert.equal(quote(selected,'website',[{slug:'other',quantity:8}],650).fee,650);
});
test('existing lower/free shipping wins', () => {
  assert.equal(quote(offer,'website',items(2),0).fee,0);
  assert.equal(quote(offer,'website',items(1),150).fee,150);
  assert.equal(quote(offer,'website',items(1),150).offerName,null);
});
test('validation rejects invalid tiers, dates and channels', () => {
  for (const changes of [{tiers:[{quantity:1.5,fee:0}]},{tiers:[{quantity:1,fee:-1}]},{tiers:[{quantity:1,fee:100},{quantity:1,fee:0}]},{tiers:[{quantity:1,fee:0},{quantity:2,fee:100}]},{channels:['bad']},{startDate:'bad'},{startDate:'2026-09-08',endDate:'2026-09-07'}]) assert.throws(()=>validate({...offer,...changes}));
  assert.deepEqual(validate(offer),offer);
});
function loadEstimate() {
  const api = {};
  const mocks = {
    '@/lib/delivery-offer': exported,
    '@/lib/delivery-offer-db': {getDeliveryOffer: async()=>offer},
    'next/server': {NextResponse:{json:(data,options={})=>({data,status:options.status??200})}},
    '@/lib/products-db': {getProductBySlug:async slug => slug==='missing'?null:{weightKg:0.25,variants:[{id:1,weightKg:2}]}},
    '@/lib/shipping': {computeDeliveryFee:(weight)=>weight>1?650:500,getDeliveryPricing:async()=>({basePrice:500,extraKgPrice:150})},
  };
  const code=ts.transpileModule(fs.readFileSync('src/app/api/shipping/estimate/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('exports','require',code)(api,key=>{if(!(key in mocks))throw new Error(key);return mocks[key];});
  return payload=>api.POST({json:async()=>payload});
}
test('estimate endpoint agrees across channels and ignores product prices',async()=>{
  const post=loadEstimate();
  for(const channel of ['website','pos','reseller']) for(const [quantity,fee] of [[1,350],[2,200],[3,0]]) {
    const result=await post({channel,items:items(quantity)});
    assert.equal(result.status,200);assert.equal(result.data.shipping,fee);assert.equal(result.data.offerName,offer.name);
  }
});
test('website-only free-shipping threshold does not leak to POS or reseller',async()=>{
  const post=loadEstimate();
  assert.equal((await post({items:items(1),discountedSubtotal:10000})).data.shipping,0);
  for(const channel of ['pos','reseller']) assert.equal((await post({channel,items:items(1),discountedSubtotal:10000,freeShipping:true})).data.shipping,350);
});
test('estimate rejects invalid quantities, products, variants and payloads',async()=>{
  const post=loadEstimate();
  for(const payload of [null,{items:[null]},{items:items(1.5)},{items:items(-1)},{items:[{slug:'missing',quantity:1}]},{items:[{slug:'tee',quantity:1,variantId:99}]},{channel:'bad',items:items(1)}]) assert.equal((await post(payload)).status,400);
});
test('estimate keeps wholesale customers on weight-based delivery',async()=>{
  const post=loadEstimate();
  for(const quantity of [1,2,3]) {
    const result=await post({channel:'pos',items:items(quantity),wholesale:true});
    assert.equal(result.data.shipping,500);assert.equal(result.data.offerName,null);
  }
});

// The POS register is the one channel that prices wholesale customers differently,
// so the sale it writes must not pick up the retail quantity offer.
function loadPosSale(captured) {
  const api={};
  const answer=sql => /FROM pos_cashiers/i.test(sql)?[[{id:1}]]
    :/FROM pos_shifts/i.test(sql)?[[{id:2}]]
    :/is_wholesale_customer FROM users/i.test(sql)?[[{is_wholesale_customer:captured.wholesale?1:0}]]
    :/FROM products WHERE slug/i.test(sql)?[[{id:10,slug:'tee',sku:'TEE',name:'Tee',price:1000,wholesale_price:800,stock:500,weight_kg:1}]]
    :/^\s*INSERT INTO pos_sales/i.test(sql)?[{insertId:77}]:[[]];
  const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async sql=>answer(sql),execute:async sql=>answer(sql)};
  const mocks={
    '@/lib/delivery-offer':exported,
    '@/lib/delivery-offer-db':{getDeliveryOffer:async()=>offer,saveDeliverySnapshot:async(_c,_ch,_r,fee,offerName)=>{captured.snapshot={fee,offerName};}},
    'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status??200})}},
    '@/lib/db':{pool:{getConnection:async()=>conn},query:async()=>[]},
    '@/lib/admin':{requireAdminSection:async()=>({id:9})},
    '@/lib/pos':{makeReceiptNumber:()=>'R-TEST-1'},
    '@/lib/sms':{sendOrderConfirmationSms:async()=>{}},
    '@/lib/shipping':{computeDeliveryFee:(weight,pricing)=>weight<=1?pricing.basePrice:pricing.basePrice+Math.ceil(weight-1)*pricing.extraKgPrice,getDeliveryPricing:async()=>({basePrice:500,extraKgPrice:150})},
  };
  const code=ts.transpileModule(fs.readFileSync('src/app/api/pos/sales/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('exports','require',code)(api,key=>{if(!(key in mocks))throw new Error(key);return mocks[key];});
  return (quantity,fulfillmentType='delivery')=>api.POST({json:async()=>({items:[{slug:'tee',size:'',color:'',quantity}],customerId:55,fulfillmentType,deliveryAddress:'addr',deliveryDistrictId:1,deliveryCityId:2,paymentMethod:'cash'})});
}
test('POS sale charges wholesale customers weight-based delivery, retail customers the offer',async()=>{
  // 1kg per unit: base 500 + 150 per extra kg.
  for(const [quantity,wholesaleFee,retailFee] of [[1,500,350],[2,650,200],[3,800,0]]) {
    const wholesale={wholesale:true},retail={wholesale:false};
    const wholesaleSale=(await loadPosSale(wholesale)(quantity)).data.receipt;
    const retailSale=(await loadPosSale(retail)(quantity)).data.receipt;
    assert.equal(wholesaleSale.deliveryFee,wholesaleFee);
    assert.equal(wholesale.snapshot.offerName,null);
    assert.equal(wholesale.snapshot.fee,wholesaleFee);
    assert.equal(retailSale.deliveryFee,retailFee);
    assert.equal(retail.snapshot.offerName,offer.name);
    // Wholesale unit pricing still applies — only delivery changed.
    assert.equal(wholesaleSale.subtotal,800*quantity);
    assert.equal(retailSale.subtotal,1000*quantity);
  }
});
test('POS pickup stays free for wholesale and retail alike',async()=>{
  for(const wholesale of [true,false]) assert.equal((await loadPosSale({wholesale})(3,'pickup')).data.receipt.deliveryFee,0);
});
