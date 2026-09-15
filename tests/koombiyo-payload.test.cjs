const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(path,mocks={}) {
 const api={};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','require',code)(api,key=>{if(!(key in mocks))throw new Error(`Unexpected import: ${key}`);return mocks[key];});return api;
}
const descriptionModule=load('src/lib/courier-description.ts');
test('label contains only SKUs and variations',()=>{
 assert.equal(descriptionModule.courierItemDescription([{name:'Long product name',sku:'10000',variation:'L / White'},{name:'Another long name',sku:'10001',variation:'XL / Black'}]),'10000 / L / White; 10001 / XL / Black');
 assert.equal(descriptionModule.courierItemDescription([{sku:'10000',variation:''}]),'10000');
});
function route(kind,total='2340',paid=false,paymentMethod='cod',paidAmount) {
 let sent;
 const sale={receipt_number:'TEST',order_ref:'TEST',customer_name:'Customer',customer_phone:'0770000000',customer_phone_2:null,total,paid_amount:kind==='pos'?(paidAmount??0):undefined,payment_status:paid?'paid':'unpaid',payment_method:paymentMethod,fulfillment_type:'delivery',delivery_address:'Address',address:'Address',delivery_status:'accepted',status:'confirmed',koombiyo_waybill_id:'123',koombiyo_status:null};
 const api=load(kind==='pos'?'src/app/api/admin/pos/sales/koombiyo/route.ts':'src/app/api/admin/orders/koombiyo/route.ts',{
  'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status??200})}},
  '@/lib/admin':{requireAdminSection:async()=>({id:1})},
  '@/lib/db':{query:async sql=>sql.includes('FROM pos_sale_items')||sql.includes('FROM order_items oi')||sql.includes('FROM reseller_order_items oi')?[{name:'Long product name',sku:'10000',variation:'L / White'}]:sql.trim().startsWith('SELECT')?[sale]:[]},
  '@/lib/koombiyo':{submitOrder:async input=>{sent=input;return {ok:true};}},
  '@/lib/courier-description':descriptionModule,
  '@/lib/sms':{},'@/lib/mail':{},
 });
 return {call:()=>api.POST({json:async()=>({receiptNumber:'TEST',orderRef:'TEST',action:'place-order',type:kind==='reseller'?'reseller':undefined})}),sent:()=>sent};
}
for(const kind of ['pos','website','reseller']) test(`${kind} sends saved total including delivery exactly once`,async()=>{
 const app=route(kind);assert.equal((await app.call()).status,200);assert.equal(app.sent().codAmount,2340);assert.equal(app.sent().description,'10000 / L / White');
});
test('POS with free delivery sends merchandise total',async()=>{const app=route('pos','5970');await app.call();assert.equal(app.sent().codAmount,5970);});
test('POS advance payment reduces courier COD to the remaining balance',async()=>{const app=route('pos','5000',false,'cash',2000);await app.call();assert.equal(app.sent().codAmount,3000);});
test('fully paid POS delivery sends zero courier COD',async()=>{const app=route('pos','5000',true,'cash',5000);await app.call();assert.equal(app.sent().codAmount,0);});
test('successfully paid customer card order sends zero COD',async()=>{const app=route('website','2340',true,'onepay');assert.equal((await app.call()).status,200);assert.equal(app.sent().codAmount,0);});
test('unpaid customer card order cannot be booked as COD',async()=>{const app=route('website','2340',false,'onepay');assert.equal((await app.call()).status,409);assert.equal(app.sent(),undefined);});
for(const kind of ['website','reseller']) test(`${kind} COD total is independent of its payment-status flag`,async()=>{const app=route(kind,'2340',true);assert.equal((await app.call()).status,200);assert.equal(app.sent().codAmount,2340);});
for(const kind of ['website','reseller']) test(`${kind} invalid totals cannot reach courier`,async()=>{const app=route(kind,'invalid');assert.equal((await app.call()).status,400);assert.equal(app.sent(),undefined);});
test('invalid POS totals cannot reach courier',async()=>{const app=route('pos','invalid');assert.equal((await app.call()).status,400);assert.equal(app.sent(),undefined);});
