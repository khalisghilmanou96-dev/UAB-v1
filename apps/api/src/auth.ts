import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
export type Role="admin"|"auditor"|"viewer";
export type Session={email:string;role:Role;tenantId:string;exp:number};

function b64(x:string){return Buffer.from(x).toString("base64url")}
function unb64(x:string){return Buffer.from(x,"base64url").toString()}
function mac(x:string){return createHmac("sha256",config.sessionSecret).update(x).digest("base64url")}

export function issueSession(email:string,role:Role,tenantId:string){
  const payload=b64(JSON.stringify({email,role,tenantId,exp:Date.now()+config.ttl*1000}));
  return payload+"."+mac(payload);
}
export function parseSession(token:string|undefined):Session|null{
  if(!token)return null; const [p,s]=token.split("."); if(!p||!s)return null;
  const a=Buffer.from(mac(p)),b=Buffer.from(s); if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  try{const x=JSON.parse(unb64(p));return x.exp>Date.now()?x:null}catch{return null}
}
export function cookie(req:any,name:string){
  const raw=String(req.headers.cookie??"");
  for(const part of raw.split(";")){const [k,...v]=part.trim().split("=");if(k===name)return decodeURIComponent(v.join("="))}
}
export function sessionCookie(token:string){
  return `uab_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${config.ttl}${config.secureCookie?"; Secure":""}`;
}
export function clearCookie(){return "uab_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"}
export function passwordEqual(a:string,b:string){
  const salt=Buffer.from("uab-demo-static-salt"); // demo env users only; production identity should use SSO/IdP
  const x=scryptSync(a,salt,32),y=scryptSync(b,salt,32);return timingSafeEqual(x,y);
}
export function csrfToken(){return randomBytes(24).toString("base64url")}
