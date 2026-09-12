const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(path,mocks={}) {
 const api={}; const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','require',code)(api,key=>key in mocks?mocks[key]:require(key)); return api;
}
const {cloneProductImages}=load('src/lib/product-duplicate.ts');
test('copies each uploaded image once, preserving static URLs',async()=>{
 const calls=[];const map=await cloneProductImages(async(sql,params)=>{calls.push(params[0]);return {affectedRows:1,insertId:100+params[0]};},['/api/products/images/1','/api/products/images/1','/api/products/images/2','/images/static.webp']);
 assert.deepEqual(calls,[1,2]);assert.equal(map.get('/api/products/images/2'),'/api/products/images/102');assert.equal(map.has('/images/static.webp'),false);
});
function setup({missing=false,failVariant=false,admin=true}={}) {
 const calls=[];let committed=false,rolledBack=false,released=false;
 const execute=async(sql,params=[])=>{
  calls.push({sql,params});
  if(sql.startsWith('SELECT id FROM products WHERE id')) return [[{id:7}]];
  if(sql.startsWith('SELECT id FROM products WHERE sku')) return [[]];
  if(sql.startsWith('INSERT INTO product_images')) return [{affectedRows:missing?0:1,insertId:Number(params[0])+100}];
  if(sql.startsWith('INSERT INTO products')) return [{insertId:99}];
  if(sql.includes('INSERT INTO product_variants')&&failVariant) throw new Error('variant failed');
  return [{affectedRows:1}];
 };
 const conn={execute,beginTransaction:async()=>{},commit:async()=>{committed=true},rollback:async()=>{rolledBack=true},release:()=>{released=true}};
 const api=load('src/app/api/admin/products/route.ts',{
  'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status??200})}},
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/db':{query:async()=>[],pool:{getConnection:async()=>conn}},
  '@/lib/admin':{requireAdminSection:async()=>admin?{id:1}:null},
  '@/lib/product-duplicate':{cloneProductImages},
 });
 return {post:body=>api.POST({json:async()=>structuredClone(body)}),calls,state:()=>({committed,rolledBack,released})};
}
const payload={duplicateSourceId:7,copyStock:false,name:'Tee (Copy)',slug:'tee-copy',sku:'COPY',category:'men',productType:'variable',regularPrice:'1990',description:'Original description',paymentMethods:['OnePay'],isPublish:false,stock:8,image:'/api/products/images/1',images:['/api/products/images/1'],variants:[{sku:'COPY-1',attributeSummary:'Black / XL',price:1990,stock:8,image:'/api/products/images/2',isDefault:true}],links:[]};
test('new draft and variants use independent images and zero stock without touching source',async()=>{
 const app=setup();const result=await app.post(payload);assert.equal(result.status,200);
 const product=app.calls.find(c=>c.sql.startsWith('INSERT INTO products'));assert.equal(product.params[14],'/api/products/images/101');assert.equal(product.params[21],0);assert.equal(product.params[24],0);
 const variant=app.calls.find(c=>c.sql.includes('INSERT INTO product_variants'));assert.equal(variant.params[0],99);assert.equal(variant.params[9],0);assert.equal(variant.params.at(-1),'/api/products/images/102');
 const association=app.calls.find(c=>c.sql.startsWith('UPDATE product_images'));assert.deepEqual(association.params,[99,101,102]);
 assert.equal(app.calls.some(c=>c.sql.startsWith('UPDATE products')),false);assert.deepEqual(app.state(),{committed:true,rolledBack:false,released:true});assert.equal(payload.variants[0].stock,8);
});
test('stock quantities can be copied explicitly',async()=>{
 const app=setup();assert.equal((await app.post({...payload,copyStock:true})).status,200);assert.equal(app.calls.find(c=>c.sql.includes('INSERT INTO product_variants')).params[9],8);
});
for(const options of [{missing:true},{failVariant:true}]) test(`failure rolls back every copy: ${JSON.stringify(options)}`,async()=>{
 const app=setup(options);const original=console.error;console.error=()=>{};try{assert.equal((await app.post(payload)).status,500);}finally{console.error=original;}
 assert.deepEqual(app.state(),{committed:false,rolledBack:true,released:true});
});
test('unauthorized duplication is forbidden',async()=>{const app=setup({admin:false});assert.equal((await app.post(payload)).status,403);assert.equal(app.calls.length,0);});
