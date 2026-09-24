import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotHandler,createConfigHandler} from '../lib/backend.js';
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
async function invoke(handler,{method='GET',token='user-token',body}={}){
 const req={method,headers:token?{authorization:'Bearer '+token}:{},body};
 const res={setHeader(){},end(text){this.body=JSON.parse(text)}};
 await handler(req,res);return res;
}
const response=(value,status=200)=>new Response(JSON.stringify(value),{status});
test('missing configuration fails closed; config never returns secret keys',async()=>{
 const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_bad',SUPABASE_SERVICE_ROLE_KEY:'secret'};
 assert.equal((await invoke(createSnapshotHandler({env}))).statusCode,503);
 assert.deepEqual((await invoke(createConfigHandler({env}))).body,{configured:false});
});
test('missing or rejected token does not query snapshots',async()=>{
 let calls=0;const handler=createSnapshotHandler({env,fetchImpl:async()=>{calls++;return response({},401)}});
 assert.equal((await invoke(handler,{token:null})).statusCode,401);assert.equal(calls,0);
 assert.equal((await invoke(handler)).statusCode,401);assert.equal(calls,1);
});
test('load forwards caller token and filters verified user, not client user ID',async()=>{
 const calls=[];const handler=createSnapshotHandler({env,fetchImpl:async(url,options)=>{
 calls.push({url,options});return calls.length===1?response({id:'user-a'}):response([{snapshot:{rooms:[]},revision:2,updated_at:'now'}]);}});
 const result=await invoke(handler,{body:{userId:'user-b'}});
 assert.equal(result.body.revision,2);assert.match(calls[1].url,/user_id=eq.user-a$/);
 for(const call of calls){assert.equal(call.options.headers.Authorization,'Bearer user-token');assert.equal(call.options.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);}
});
test('save strips user identity and preserves expected revision; conflict returns 409',async()=>{
 let saved;const handler=createSnapshotHandler({env,fetchImpl:async(url,options)=>{
 if(url.endsWith('/user'))return response({id:'user-a'});
 saved=JSON.parse(options.body);return response({code:'40001'},409);}});
 const result=await invoke(handler,{method:'PUT',body:{snapshot:{rooms:[]},expectedRevision:3,userId:'user-b'}});
 assert.equal(result.statusCode,409);assert.deepEqual(saved,{p_snapshot:{rooms:[]},p_expected_revision:3});
});
test('invalid snapshot and oversized payload rejected before storage',async()=>{
 let calls=0;const handler=createSnapshotHandler({env,fetchImpl:async()=>{calls++;return response({id:'user-a'})}});
 assert.equal((await invoke(handler,{method:'PUT',body:{snapshot:[],expectedRevision:0}})).statusCode,400);
 assert.equal((await invoke(handler,{method:'PUT',body:{snapshot:{text:'x'.repeat(2097152)},expectedRevision:0}})).statusCode,413);
 assert.equal(calls,2);
});
test('empty account and successful save use stable response shape',async()=>{
 const handler=createSnapshotHandler({env,fetchImpl:async(url)=>url.endsWith('/user')?response({id:'u'}):response([])});
 assert.deepEqual((await invoke(handler)).body,{snapshot:null,revision:0,updatedAt:null});
 const save=createSnapshotHandler({env,fetchImpl:async(url)=>url.endsWith('/user')?response({id:'u'}):response([{snapshot:{worlds:[]},revision:1,updated_at:'now'}])});
 assert.deepEqual((await invoke(save,{method:'PUT',body:{snapshot:{worlds:[]},expectedRevision:0}})).body,{snapshot:{worlds:[]},revision:1,updatedAt:'now'});
});
