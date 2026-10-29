import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
vi.mock('../utils/offlineCache',()=>({getOfflineCacheData:vi.fn(async()=>null),setOfflineCacheEntry:vi.fn(async()=>{})}));
let server,origin,handler,api,requests;
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
const session=(access='old')=>({user:{id:'original-id',email:'person@test.io'},accessToken:access,refreshToken:'refresh-token'});
beforeAll(async()=>{
 server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const request={url:req.url,method:req.method,auth:req.headers.authorization,body:raw?JSON.parse(raw):null};requests.push(request);await handler(request,res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
afterAll(async()=>{await new Promise(resolve=>server.close(resolve));vi.unstubAllEnvs();vi.unstubAllGlobals();});
beforeEach(async()=>{
 const values=new Map();vi.stubGlobal('localStorage',{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});
 vi.stubEnv('VITE_API_BASE_URL',origin);vi.resetModules();requests=[];
 handler=async(req,res)=>json(res,200,session());
 api=await import('./renderApi');
});
describe('Heroku browser wire contracts',()=>{
 it('exchanges email credentials once, validates the complete session, and calls recovery',async()=>{
  await api.authService.register(' person@test.io ','password',' Person ');
  expect(requests).toHaveLength(1);expect(requests[0].body).toEqual({email:'person@test.io',password:'password',name:'Person'});
  handler=async(req,res)=>{expect(req.url).toBe('/auth/recovery');json(res,202,{message:'Generic recovery result'});};
  expect(await api.authService.sendPasswordRecovery(' person@test.io ')).toEqual({message:'Generic recovery result'});
  handler=async(_req,res)=>json(res,200,{user:{id:'wrong'},accessToken:'partial'});
  await expect(api.authService.login('new@test.io','password')).rejects.toThrow();
  expect(JSON.parse(localStorage.getItem(api.TOKEN_KEYS.user)).$id).toBe('original-id');
 });
 it('refreshes concurrent 401 responses once and replays with the rotated access token',async()=>{
  await api.authService.login('person@test.io','password');let refreshes=0;
  handler=async(req,res)=>{
   if(req.url==='/auth/refresh'){refreshes++;await new Promise(resolve=>setTimeout(resolve,15));return json(res,200,session('new'));}
   return json(res,req.auth==='Bearer new'?200:401,{ok:req.auth==='Bearer new'});
  };
  const result=await Promise.all([api.http.get('/private'),api.http.get('/private')]);
  expect(result.every(r=>r.data.ok)).toBe(true);expect(refreshes).toBe(1);
 });
 it('retains sessions during a server outage and prevents refresh from resurrecting a logout',async()=>{
  await api.authService.login('person@test.io','password');
  handler=async(_req,res)=>json(res,503,{error:'unavailable'});
  await expect(api.authService.refresh()).rejects.toThrow();expect(localStorage.getItem(api.TOKEN_KEYS.refresh)).toBe('refresh-token');
  let release,started;const ready=new Promise(resolve=>{started=resolve;});
  handler=async(_req,res)=>{started();await new Promise(resolve=>{release=resolve;});json(res,200,session('new'));};
  const pending=api.authService.refresh();await ready;await api.authService.logout();release();
  await expect(pending).rejects.toThrow();expect(localStorage.getItem(api.TOKEN_KEYS.access)).toBeNull();
 });
 it('merges flattened legacy sync and requires a server-owned timestamp and account',async()=>{
  await api.authService.login('person@test.io','password');
  handler=async(req,res)=>{
   if(req.method==='GET')return json(res,200,{id:'old-doc',userId:'original-id',stateData:null,state:null,updatedAt:10,createdAt:1,theme:'dark'});
   expect(JSON.parse(req.body.stateData)).toMatchObject({theme:'dark',fontSize:18});return json(res,200,{userId:'original-id',updatedAt:20});
  };
  expect(await api.syncService.pullState('original-id')).toEqual({state:{theme:'dark'},updatedAt:10});
  expect(await api.syncService.pushState('original-id',{fontSize:18})).toEqual({updatedAt:20});
  handler=async(_req,res)=>json(res,200,{userId:'someone-else',stateData:'{}',updatedAt:20});
  await expect(api.syncService.pushState('original-id',{})).rejects.toThrow('mismatch');
  expect(requests.filter(r=>r.method==='PUT')).toHaveLength(1);
 });
 it('supports the empty sync canary and never invents a missing write watermark',async()=>{
  await api.authService.login('person@test.io','password');
  handler=async(req,res)=>json(res,200,req.method==='GET'?{id:null,userId:'original-id',stateData:null,state:null,updatedAt:0}:{userId:'original-id'});
  expect(await api.syncService.pullState('original-id')).toBeNull();
  await expect(api.syncService.pushState('original-id',{})).rejects.toThrow('timestamp');
 });
 it('routes page content and the selected translation/mushaf through the backend',async()=>{
  handler=async(req,res)=>{
   const url=new URL(req.url,origin);expect(url.pathname).toBe('/v1/pages/1');
   expect(url.searchParams.get('translation')).toBe('85');expect(url.searchParams.get('mushaf')).toBe('19');expect(url.searchParams.get('words')).toBe('1');
   json(res,200,{verses:[{verse_key:'1:1',text_qpc_hafs:'بسم الله',translations:[{resource_id:85,text:'Selected'}]}],pagination:{next_page:null}});
  };
  const {getVersesByPage}=await import('./api/quranApi');
  expect((await getVersesByPage(1,85,7,'madani-tajweed')).verses[0].arabic_text).toBe('بسم الله');
 });
});
