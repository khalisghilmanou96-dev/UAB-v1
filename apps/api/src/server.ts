import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";
import { config } from "./config.js";
import { cookie, issueSession, parseSession, sessionCookie, clearCookie, passwordEqual, type Role } from "./auth.js";
import { MemoryStore } from "./store.js";

const store=new MemoryStore();
const attempts=new Map<string,{n:number;start:number}>();
const csrf=new Map<string,string>();

function json(res:any,code:number,body:unknown,headers:Record<string,string>={}){
 res.writeHead(code,{"content-type":"application/json","cache-control":"no-store",...headers});res.end(JSON.stringify(body));
}
function body(req:any):Promise<any>{return new Promise((ok,bad)=>{let s="";req.on("data",(c:any)=>{s+=c;if(s.length>2_000_000)req.destroy()});req.on("end",()=>{try{ok(JSON.parse(s||"{}"))}catch{bad(new Error("json"))}})})}
function session(req:any){return parseSession(cookie(req,"uab_session"))}
function requireRole(req:any,res:any,roles:Role[]){const s=session(req);if(!s){json(res,401,{error:"unauthorized"});return null}if(!roles.includes(s.role)){json(res,403,{error:"forbidden"});return null}return s}
function sign(x:any,key:string){const c=JSON.stringify(x,Object.keys(x).sort());return "hmac-sha256:"+createHmac("sha256",key).update(c).digest("hex")}
function metrics(es:any[]){
 const ev=es.filter(e=>["ALLOW","BLOCK","UNKNOWN"].includes(e.verdict)),bl=ev.filter(e=>e.verdict!=="ALLOW"),l=ev.map(e=>Number(e.latencyUs||0)).sort((a,b)=>a-b);
 const p=(q:number)=>l.length?l[Math.min(l.length-1,Math.ceil(q*l.length)-1)]:0;
 return {events:es.length,evaluated:ev.length,blocked:bl.length,driftRate:ev.length?bl.length/ev.length:0,latencyUs:{p50:p(.5),p95:p(.95),p99:p(.99)},reasons:Object.fromEntries([...new Set(bl.map(e=>e.reason))].map(r=>[r,bl.filter(e=>e.reason===r).length]))}
}
function windowed(es:any[],hours:number){
 const h=Number.isFinite(hours)?Math.min(24*365,Math.max(1,hours)):24;
 const cut=Date.now()-h*3600000;
 return es.filter(e=>{const t=Date.parse(String(e.timestamp??""));return Number.isFinite(t)&&t>=cut});
}

function series(es:any[],hours:number,buckets=24){
 const h=Number.isFinite(hours)?Math.min(24*365,Math.max(1,hours)):24,start=Date.now()-h*3600000,step=h*3600000/buckets;
 return Array.from({length:buckets},(_,i)=>{const from=start+i*step,to=from+step,ev=es.filter(e=>{const t=Date.parse(String(e.timestamp??""));return Number.isFinite(t)&&t>=from&&t<to&&["ALLOW","BLOCK","UNKNOWN"].includes(e.verdict)}),blocked=ev.filter(e=>e.verdict!=="ALLOW").length;return {timestamp:new Date(from).toISOString(),evaluated:ev.length,blocked,driftRate:ev.length?blocked/ev.length:0}})
}
type AlertState = {
 active: boolean;
 lastReasons: string;
 lastSentAt: number;
};

const alertState = new Map<string, AlertState>();

async function alertIfNeeded(tenant:string){
 const events=await store.all(tenant);
 const m=metrics(events);

 const now=Date.now();
 const minuteCut=now-60_000;

 const blockedLastMinute=events.filter(e=>{
   const t=Date.parse(String(e.timestamp??""));
   return Number.isFinite(t)
     && t>=minuteCut
     && (e.verdict==="BLOCK"||e.verdict==="UNKNOWN");
 }).length;

 const driftTriggered=m.driftRate>=config.driftAlert;
 const blocksTriggered=blockedLastMinute>=config.blocksPerMinute;

 const reasons:string[]=[];
 if(driftTriggered)reasons.push("DRIFT_RATE");
 if(blocksTriggered)reasons.push("BLOCKS_PER_MINUTE");

 const reasonKey=reasons.join(",");
 const previous=alertState.get(tenant);

 if(!driftTriggered&&!blocksTriggered){
   if(previous?.active){
     alertState.set(tenant,{
       active:false,
       lastReasons:"",
       lastSentAt:previous.lastSentAt
     });
   }
   return;
 }

 if(!config.webhook)return;

 if(previous?.active&&previous.lastReasons===reasonKey){
   return;
 }

 try{
   await fetch(config.webhook,{
     method:"POST",
     headers:{"content-type":"application/json"},
     body:JSON.stringify({
       type:"UAB_ALERT",
       tenantId:tenant,
       reasons,
       driftRate:m.driftRate,
       driftRateThreshold:config.driftAlert,
       blockedLastMinute,
       blocksPerMinuteThreshold:config.blocksPerMinute
     })
   });

   alertState.set(tenant,{
     active:true,
     lastReasons:reasonKey,
     lastSentAt:now
   });
 }catch{}
}
setInterval(()=>void store.retain(config.retentionDays),3600000).unref();

createServer(async(req,res)=>{
 try{
  const u=new URL(req.url??"/","http://localhost");
  if(req.method==="GET"&&u.pathname==="/health")return json(res,200,{status:"ok",version:"0.3.1",storage:config.storage});
  if(req.method==="GET"&&(u.pathname==="/"||u.pathname==="/dashboard")){
    const f=resolve("apps/dashboard/index.html");res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end(readFileSync(f));
  }
  if(req.method==="POST"&&u.pathname==="/auth/login"){
    const ip=String(req.socket.remoteAddress??"unknown"),now=Date.now(),a=attempts.get(ip)??{n:0,start:now};
    if(now-a.start>900000){a.n=0;a.start=now} if(a.n>=8)return json(res,429,{error:"too_many_attempts"});
    const b=await body(req),user=config.users.find(x=>x.email===b.email);
    if(!user||!passwordEqual(String(b.password??""),user.password)){a.n++;attempts.set(ip,a);return json(res,401,{error:"invalid_credentials"})}
    attempts.delete(ip);const token=issueSession(user.email,user.role as Role,config.tenantId);
    return json(res,200,{email:user.email,role:user.role,tenantId:config.tenantId,tenantName:config.tenantName},{"set-cookie":sessionCookie(token)});
  }
  if(req.method==="POST"&&u.pathname==="/auth/logout")return json(res,200,{ok:true},{"set-cookie":clearCookie()});
  if(req.method==="GET"&&u.pathname==="/auth/me"){const s=session(req);return s?json(res,200,{...s,tenantName:config.tenantName}):json(res,401,{error:"unauthorized"})}

  if(req.method==="POST"&&u.pathname==="/v1/events"){
    const s=requireRole(req,res,["admin","auditor"]);if(!s)return;
    const b=await body(req),batch=Array.isArray(b)?b:[b],rows=[];
    for(const input of batch){
      if(!input?.eventId||!input?.timestamp||!input?.verdict)return json(res,400,{error:"invalid_event"});
      const payload={...input,tenantId:s.tenantId}; delete payload.signature;
      rows.push({...payload,signature:sign(payload,config.eventKey)});
    }
    await store.append(rows);void alertIfNeeded(s.tenantId);return json(res,202,{accepted:rows.length});
  }
  if(req.method==="GET"&&u.pathname==="/v1/events"){const s=requireRole(req,res,["admin","auditor","viewer"]);if(!s)return;const limit=Math.min(500,Math.max(1,Number(u.searchParams.get("limit")??100))),hours=Number(u.searchParams.get("hours")??24),events=windowed(await store.all(s.tenantId),hours).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,limit);return json(res,200,{items:events,hours})}
  if(req.method==="GET"&&u.pathname==="/v1/metrics"){const s=requireRole(req,res,["admin","auditor","viewer"]);if(!s)return;const hours=Number(u.searchParams.get("hours")??24),events=windowed(await store.all(s.tenantId),hours);return json(res,200,{...metrics(events),requests:new Set(events.map(e=>e.requestId).filter(Boolean)).size,hours,series:series(events,hours)})}
  if(req.method==="GET"&&u.pathname==="/v1/blocks"){const s=requireRole(req,res,["admin","auditor","viewer"]);if(!s)return;const limit=Math.min(500,Math.max(1,Number(u.searchParams.get("limit")??100))),hours=Number(u.searchParams.get("hours")??24),events=windowed(await store.all(s.tenantId),hours).filter(e=>e.verdict==="BLOCK"||e.verdict==="UNKNOWN").sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,limit);return json(res,200,{items:events,hours})}
  if(req.method==="GET"&&u.pathname==="/v1/alerts/config"){const s=requireRole(req,res,["admin","auditor","viewer"]);if(!s)return;return json(res,200,{driftRateThreshold:config.driftAlert,blocksPerMinuteThreshold:config.blocksPerMinute,blocksPerMinuteEnforced:true,blocksPerMinuteWindowSeconds:60,webhookConfigured:Boolean(config.webhook)})}
  if(req.method==="GET"&&u.pathname==="/v1/admin/users"){const s=requireRole(req,res,["admin"]);if(!s)return;return json(res,200,{items:config.users.map(({email,role})=>({email,role,tenantId:s.tenantId}))})}
  if(req.method==="POST"&&u.pathname==="/v1/admin/retention"){const s=requireRole(req,res,["admin"]);if(!s)return;return json(res,200,{deleted:await store.retain(config.retentionDays),days:config.retentionDays})}
  json(res,404,{error:"not_found"});
 }catch{json(res,500,{error:"internal_error"})}
}).listen(config.port,()=>console.log(`UAB Control Plane v0.3.1 listening on :${config.port}`));
