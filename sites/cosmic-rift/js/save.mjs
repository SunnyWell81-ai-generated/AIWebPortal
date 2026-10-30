import {H,Huge,geometricCost} from './number.mjs';
import {CONFIG,SKILLS,UPGRADES,BUILDINGS,BUILDING_COUNT,LEGACY_BUILDING_COUNT,INFINITE_SKILLS,RIFT_RESEARCH} from './config.mjs';
import {NUMBER_FIELDS,HUGE_STATS,ACHIEVEMENTS,freshState} from './engine.mjs';
import {feverRanges,riftDurationMultiplier} from './rifts.mjs';
import {validTimestamp} from './clock.mjs';
import {emptyResearch,isNewIndex,countAt,purchasedCost,rangeCount} from './research.mjs';
import {migratePrestigeState,prestigeLevelAt,oldPrestigeMultiplier} from './prestige.mjs';
import {migrateInfiniteSkills,validateInfiniteSkills,maxComboRecord} from './infinite-skills.mjs';
export const SAVE_KEYS={current:'cosmic-rift.save.v1',previous:'cosmic-rift.backup.v1'};
export class SaveConflictError extends Error {constructor(){super('別のタブでセーブが更新されました。この画面の自動保存を停止しています。必要ならExport後に再読み込みしてください。');this.name='SaveConflictError';}}
export class UnsupportedSaveError extends Error {constructor(){super('この版では扱えないセーブ形式です。元のデータを保護しています。');this.name='UnsupportedSaveError';}}
export const SAVE_ERROR='セーブデータが破損しているか、変更されています。';
const FORMAT='CosmicRiftSave';
// Deterrence against casual editing, NOT a security boundary: this derivation is public.
const KEY_PARTS=['cr:observatory:2026','event-horizon-13','red-resonance','infinity:permanent'];
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
let keyPromise;
async function getKey() {
 if(!globalThis.crypto?.subtle)throw new Error('暗号化セーブにはHTTPSまたはlocalhostが必要です。');
 return keyPromise??=crypto.subtle.digest('SHA-256',encoder.encode(KEY_PARTS.join('|'))).then(bytes=>crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']));
}
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const unbase64=text=>{if(typeof text!=='string'||! /^[A-Za-z0-9+/]*={0,2}$/.test(text))throw new Error(SAVE_ERROR);return Uint8Array.from(atob(text),c=>c.charCodeAt(0));};
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const real=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const list=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>integer(x,0,CONFIG.maxBuildingCount));
const uniqueIds=(v,allowed)=>Array.isArray(v)&&v.length<=allowed.length&&new Set(v).size===v.length&&v.every(x=>allowed.includes(x));
function huge(v) {if(!v||typeof v!=='object'||Object.keys(v).length!==2||!real(v.m,0,10)||v.m===10||!integer(v.e,-1e15,1e15)||((v.m===0&&v.e!==0)||(v.m>0&&v.m<1)))throw new Error(SAVE_ERROR);return H(v);}
const above=(a,b)=>a.gt(b.mul(1+1e-10));
export function validateState(raw,now=Date.now(),{allowClockRollback=false}={}) {
 try {
  if(!raw||typeof raw!=='object'||raw.version!==CONFIG.version)throw 0;
  const s=structuredClone(raw),fresh=freshState(now);
  if(Object.keys(s).some(k=>!Object.hasOwn(fresh,k))||Object.keys(fresh).some(k=>!Object.hasOwn(s,k)))throw 0;
  for(const k of NUMBER_FIELDS)s[k]=huge(s[k]);
  for(const k of ['createdAt','savedAt','runStartedAt'])if(!validTimestamp(s[k])||(!allowClockRollback&&s[k]>now+120000))throw 0;
  if(s.createdAt>s.savedAt||s.runStartedAt<s.createdAt||s.runStartedAt>s.savedAt+120000)throw 0;
  for(const k of ['runTime','playTime'])if(!real(s[k],0,1e12))throw 0;
  if(!s.activity||Object.keys(s.activity).length!==3||!validTimestamp(s.activity.since)||s.activity.since<s.createdAt||!real(s.activity.runSeconds,0,1e12)||!real(s.activity.totalSeconds,0,1e12)||s.activity.runSeconds>s.activity.totalSeconds)throw 0;
  // An authenticated timestamp may be ahead of the device after a clock correction.
  // Validate its internal chronology; production separately clamps negative elapsed time.
  const referenceTime=allowClockRollback?Math.max(now,s.savedAt):now;
  if(s.runTime>(referenceTime-s.runStartedAt)/1000+300||s.playTime>(referenceTime-s.createdAt)/1000+300)throw 0;
  if(!list(s.buildings,BUILDING_COUNT)||!list(s.redBuildings,BUILDING_COUNT)||!list(s.endless,BUILDING_COUNT)||s.endless.some(n=>n>1e9))throw 0;
  if(!Array.isArray(s.facilityResearch)||s.facilityResearch.length!==BUILDING_COUNT)throw 0;
  let generatedBought=0;
  for(let i=0;i<BUILDING_COUNT;i++){
   const ranges=s.facilityResearch[i];if(!Array.isArray(ranges))throw 0;let previous=-2;
   for(const range of ranges){if(!Array.isArray(range)||range.length!==2)throw 0;const [a,b]=range;if(!isNewIndex(a)||!isNewIndex(b)||a>b||a<=previous+1||(a<=5&&b>=5)||countAt(b)>s.buildings[i]+s.redBuildings[i])throw 0;previous=b;}
   generatedBought+=rangeCount(ranges);
  }
  if(!uniqueIds(s.upgrades,UPGRADES.map(u=>u.id))||!uniqueIds(s.skills,SKILLS.map(k=>k.id))||!uniqueIds(s.achievements,ACHIEVEMENTS.map(a=>a.id)))throw 0;
  for(const k of ['infinityEarned','infinitySpent','prestiges'])if(!integer(s[k]))throw 0;
  if(!Array.isArray(s.rmUnlocked)||s.rmUnlocked.length!==BUILDING_COUNT||s.rmUnlocked.some(v=>typeof v!=='boolean'))throw 0;
  if(!integer(s.prestigeMilestoneLevel,0,1e15-5)||s.prestigeMilestoneLevel>prestigeLevelAt(s.lifetimeDM)||(!s.prestiges&&s.prestigeMilestoneLevel))throw 0;
  if(!real(s.legacyPrestigeMultiplier,1,3)||s.legacyPrestigeMultiplier>oldPrestigeMultiplier(s.prestiges)+1e-12)throw 0;
  const earned=s.lifetimeDM.gte(CONFIG.infinity.first)?Math.floor((s.lifetimeDM.log10()-Math.log10(CONFIG.infinity.first))/Math.log10(CONFIG.infinity.growth)+1e-10)+1:0;
  if(s.infinityEarned!==earned||s.infinitySpent>s.infinityEarned)throw 0;
  let spent=0;
  for(const id of s.skills){const k=SKILLS.find(k=>k.id===id);spent+=k.cost;if(s.infinityEarned<k.earned||(k.requires&&!s.skills.includes(k.requires)))throw 0;}
  spent+=validateInfiniteSkills(s);if(s.infinitySpent!==spent)throw 0;
  for(const id of s.upgrades){const u=UPGRADES.find(u=>u.id===id);if(u.requires&&!s.upgrades.includes(u.requires))throw 0;if(u.building!==undefined&&s.buildings[u.building]+s.redBuildings[u.building]<u.amount)throw 0;if(u.unlock&&!s.runDM.gte(u.unlock))throw 0;}
  if(above(s.dm,s.runDM)||above(s.runDM,s.lifetimeDM)||above(s.rm,s.lifetimeRM))throw 0;
  if(above(s.runProducedRM,s.lifetimeRM))throw 0;
  let darkSpent=H(0),facilitySpent=H(0),redSpent=H(0);
  for(const b of BUILDINGS){facilitySpent=facilitySpent.add(geometricCost(b.cost,CONFIG.dmGrowth,0,s.buildings[b.id]));darkSpent=darkSpent.add(geometricCost(b.cost*CONFIG.repeatUpgrade.costFactor,CONFIG.repeatUpgrade.growth,0,s.endless[b.id]));redSpent=redSpent.add(geometricCost(b.redCost,CONFIG.rmGrowth,0,s.redBuildings[b.id]));}
  if(above(s.dmFacilitySavings,facilitySpent.mul(0.3)))throw 0;
  darkSpent=darkSpent.add(facilitySpent.sub(s.dmFacilitySavings));
  for(const id of s.upgrades)darkSpent=darkSpent.add(UPGRADES.find(u=>u.id===id).cost);
  for(let i=0;i<BUILDING_COUNT;i++)darkSpent=darkSpent.add(purchasedCost(i,s.facilityResearch[i]));
  if(above(darkSpent.add(s.dm),s.runDM)||above(redSpent.add(s.rm),s.lifetimeRM)||s.stats?.prestigeRM&&above(H(s.prestiges*10),H(s.stats.prestigeRM))||s.playTime+300<s.prestiges*CONFIG.prestige.minRunSeconds)throw 0;
  if(!s.stats||Object.keys(s.stats).some(k=>!Object.hasOwn(fresh.stats,k))||Object.keys(fresh.stats).some(k=>!Object.hasOwn(s.stats,k)))throw 0;
  for(const k of HUGE_STATS)s.stats[k]=huge(s.stats[k]);
  if(above(s.runProducedRM,s.stats.buildingRM.add(s.stats.offlineRM)))throw 0;
  for(const k of ['clicks','buildingsBought','redBought','upgradesBought','riftsAppeared','riftsClicked','maxCombo'])if(!integer(s.stats[k]))throw 0;
  if(s.stats.upgradesBought<generatedBought)throw 0;
  if(!real(s.stats.offlineSeconds)||s.stats.maxCombo>maxComboRecord(s)||s.stats.riftsClicked>s.stats.riftsAppeared)throw 0;
  if(!list(s.stats.highestBuildings,BUILDING_COUNT)||!list(s.stats.highestRedBuildings,BUILDING_COUNT))throw 0;
  if(s.buildings.some((v,i)=>v>s.stats.highestBuildings[i])||s.redBuildings.some((v,i)=>v>s.stats.highestRedBuildings[i]))throw 0;
  if(s.redBuildings.some((v,i)=>(v>0||s.stats.highestRedBuildings[i]>0)&&!s.rmUnlocked[i]))throw 0;
  if(s.stats.redBought>s.stats.buildingsBought||s.stats.buildingsBought<s.buildings.reduce((a,b)=>a+b,0)+s.redBuildings.reduce((a,b)=>a+b,0)||s.stats.redBought<s.redBuildings.reduce((a,b)=>a+b,0))throw 0;
  if(above(s.stats.clickDM.add(s.stats.buildingDM).add(s.stats.riftDM).add(s.stats.offlineDM),s.lifetimeDM)||above(s.stats.prestigeRM.add(s.stats.buildingRM).add(s.stats.offlineRM),s.lifetimeRM))throw 0;
  for(const id of s.achievements)if(!ACHIEVEMENTS.find(a=>a.id===id).test(s))throw 0;
  if(!s.settings||Object.keys(s.settings).length!==3||!['standard','scientific'].includes(s.settings.notation)||typeof s.settings.motion!=='boolean'||typeof s.settings.particles!=='boolean')throw 0;
  if(!Array.isArray(s.effects)||s.effects.length>4||new Set(s.effects.map(e=>e.id)).size!==s.effects.length)throw 0;
  const duration=riftDurationMultiplier(s);
  s.effects=s.effects.map(e=>{const spec=CONFIG.rift.effects.find(x=>x.id===e.id&&x.seconds),facility=e.id==='facility',frenzy=e.id==='frenzy',tier=frenzy?feverRanges(s).find(t=>t.id===(e.tier??'normal')):null;
   // Missing tier is the original Normal Fever representation used by legacy callers.
   const maximum=frenzy?tier?.max:spec?.seconds;
   if(!spec||!maximum||!real(e.remaining,0,maximum*duration+1e-8)||Object.keys(e).some(k=>!['id','remaining',...(facility?['target']:[]),...(frenzy?['tier']:[])].includes(k))||facility&&!integer(e.target,0,BUILDING_COUNT-1))throw 0;
   return {id:e.id,remaining:e.remaining,...(facility?{target:e.target}:{}),...(frenzy&&e.tier?{tier:e.tier}:{})};});
  return s;
 }catch{throw new Error(SAVE_ERROR);}
}
// Future versions add explicit, sequential migrations here, before schema validation.
export const MIGRATIONS={
 // Old clocks include offline time. Keep them for existing prestige rules only;
 // historical visible time cannot be recovered and starts at zero on migration.
 1:(raw,now)=>({...raw,version:2,activity:{since:Math.max(now,raw.savedAt),runSeconds:0,totalSeconds:0}}),
 2:raw=>{
  // Only the known 13-entry schema may be extended. Malformed saves are not repaired.
  // Freeze this migration's destination; a later catalog expansion needs its own migration.
  const schema3Count=20;
  const extend=counts=>{if(!list(counts,LEGACY_BUILDING_COUNT))throw new Error(SAVE_ERROR);return [...counts,...Array(schema3Count-LEGACY_BUILDING_COUNT).fill(0)];};
  return {...raw,version:3,buildings:extend(raw.buildings),redBuildings:extend(raw.redBuildings),endless:extend(raw.endless),stats:{...raw.stats,highestBuildings:extend(raw.stats?.highestBuildings),highestRedBuildings:extend(raw.stats?.highestRedBuildings)}};
 },
 3:raw=>{if(Object.hasOwn(raw,'facilityResearch'))throw new Error(SAVE_ERROR);return {...raw,version:4,facilityResearch:emptyResearch()};},
 4:migratePrestigeState,
 5:migrateInfiniteSkills,
 // Old temporary effects end at upgrade; all permanent progress remains untouched.
 6:raw=>{
  if(Object.hasOwn(raw,'dmFacilitySavings')||!Array.isArray(raw.effects)||raw.effects.length>4||new Set(raw.effects.map(e=>e.id)).size!==raw.effects.length||raw.effects.some(e=>!['surge','frenzy','stable'].includes(e.id)||!real(e.remaining)||Object.keys(e).some(k=>!['id','remaining'].includes(k))))throw new Error(SAVE_ERROR);
  return {...raw,version:7,dmFacilitySavings:H(0).toJSON(),effects:[]};
 },
 7:raw=>{if(Object.hasOwn(raw,'runProducedRM'))throw new Error(SAVE_ERROR);return {...raw,version:8,runProducedRM:H(0).toJSON()};},
 8:raw=>{
  const original=INFINITE_SKILLS.slice(0,8).map(k=>k.id),levels=raw.infiniteSkills;
  if(!levels||Object.keys(levels).length!==8||Object.keys(levels).some(id=>!original.includes(id))||!Array.isArray(raw.upgrades)||raw.upgrades.some(id=>RIFT_RESEARCH.some(u=>u.id===id))||!Array.isArray(raw.effects)||raw.effects.some(e=>Object.keys(e).some(k=>!['id','remaining',...(e.id==='facility'?['target']:[])].includes(k))))throw new Error(SAVE_ERROR);
  // No historical purchases are inferred; existing progress and temporary records stay intact.
  return {...raw,version:9,infiniteSkills:{...levels,...Object.fromEntries(INFINITE_SKILLS.slice(8).map(k=>[k.id,0]))}};
 }
};
function migrate(raw,now){
 if(!raw||!integer(raw.version,1,CONFIG.version))throw new Error(SAVE_ERROR);
 while(raw.version<CONFIG.version){const next=MIGRATIONS[raw.version];if(!next)throw new Error(SAVE_ERROR);raw=next(raw,now);}
 return raw;
}
export async function encryptState(state,now=Date.now()) {
 if(!validTimestamp(now))throw new Error(SAVE_ERROR);
 const snapshot=JSON.parse(JSON.stringify(state));snapshot.savedAt=now;
 const validated=validateState(snapshot,now),iv=crypto.getRandomValues(new Uint8Array(12));
 const payload=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`${FORMAT}:1`)},await getKey(),encoder.encode(JSON.stringify(validated)));
 return {format:FORMAT,version:1,iv:base64(iv),payload:base64(new Uint8Array(payload))};
}
export async function decryptSave(envelope,now=Date.now()) {
 try {
  if(typeof envelope==='string'){if(envelope.length>2000000)throw 0;envelope=JSON.parse(envelope);}
  if(envelope&&typeof envelope==='object'&&(typeof envelope.format==='string'&&envelope.format!==FORMAT||envelope.format===FORMAT&&Object.hasOwn(envelope,'version')&&envelope.version!==1))throw new UnsupportedSaveError();
  if(!envelope||envelope.format!==FORMAT||envelope.version!==1||Object.keys(envelope).length!==4)throw 0;
  const iv=unbase64(envelope.iv),payload=unbase64(envelope.payload);if(iv.length!==12||payload.length<16||payload.length>1500000)throw 0;
  const data=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`${FORMAT}:1`)},await getKey(),payload);
  const raw=JSON.parse(decoder.decode(data));if(raw&&Object.hasOwn(raw,'version')&&!integer(raw.version,1,CONFIG.version))throw new UnsupportedSaveError();
  return validateState(migrate(raw,now),now,{allowClockRollback:true});
 }catch(error){if(error instanceof UnsupportedSaveError)throw error;throw new Error(SAVE_ERROR);}
}
export class SaveManager {
 constructor(storage){
  // Resolve browser storage inside load/save, so denied access reaches recovery UI.
  this.storage=storage??{getItem:key=>globalThis.localStorage.getItem(key),setItem:(key,value)=>globalThis.localStorage.setItem(key,value),removeItem:key=>globalThis.localStorage.removeItem(key)};
  this.queue=Promise.resolve();this.generation=0;this.lastSaved=0;this.pending=null;this.writing=false;this.blocked=false;this.expectedCurrent=undefined;
 }
 async load() {
  // Read/decrypt failures must never turn into a fresh automatic save.
  this.blocked=true;
  const current=this.storage.getItem(SAVE_KEYS.current),previous=this.storage.getItem(SAVE_KEYS.previous);
  this.expectedCurrent=current;
  if(!current&&!previous){this.blocked=false;return {state:null};}
  for(const [text,backup] of [[current,false],[previous,true]])if(text){try{const state=await decryptSave(text);this.lastSaved=state.savedAt;this.blocked=false;return {state,backup};}catch(error){if(error instanceof UnsupportedSaveError)return {state:null,corrupt:true,unsupported:true};}}
  return {state:null,corrupt:true};
 }
 save(state,capturedAt=Date.now()) {
  if(this.blocked)return Promise.reject(new Error('元のセーブを保護するため保存を停止しています。Importまたは復旧が必要です。'));
  // Freeze the state AND its matching production timestamp before any async work.
  if(!validTimestamp(capturedAt))return Promise.reject(new Error(SAVE_ERROR));
  const snapshot=JSON.parse(JSON.stringify(state));
  capturedAt=Math.max(capturedAt,snapshot.savedAt,snapshot.createdAt,snapshot.runStartedAt);
  if(this.pending&&this.pending.generation===this.generation){this.pending.snapshot=snapshot;this.pending.capturedAt=capturedAt;return this.pending.promise;}
  if(this.pending)this.pending.resolve(false);
  const job={snapshot,capturedAt,generation:this.generation};
  job.promise=new Promise((resolve,reject)=>{job.resolve=resolve;job.reject=reject;});
  this.pending=job;
  if(!this.writing){
   this.writing=true;
   // At most one active encryption and one latest pending snapshot, even on rapid lifecycle events.
   this.queue=Promise.resolve().then(async()=>{
    try{while(this.pending){const next=this.pending;this.pending=null;try{next.resolve(await this.writeSnapshot(next));}catch(error){next.reject(error);}}}
    finally{this.writing=false;}
   });
  }
  return job.promise;
 }
 async writeSnapshot(job) {
  return globalThis.navigator?.locks?.request?globalThis.navigator.locks.request('cosmic-rift-save',()=>this.writeLockedSnapshot(job)):this.writeLockedSnapshot(job);
 }
 async writeLockedSnapshot({snapshot,capturedAt,generation}) {
  if(generation!==this.generation||this.blocked)return false;
  const envelope=await encryptState(snapshot,capturedAt);await decryptSave(envelope);
  if(generation!==this.generation)return false;
  const old=this.storage.getItem(SAVE_KEYS.current);if(this.expectedCurrent!==undefined&&old!==this.expectedCurrent){this.blocked=true;throw new SaveConflictError();}let validOld=false;
  if(old){try{await decryptSave(old);validOld=true;}catch(error){if(error instanceof UnsupportedSaveError){this.blocked=true;throw error;}/* Preserve the last valid backup. */}}
  if(generation!==this.generation||this.blocked)return false;
  // A backup storage failure must abort, rather than overwrite the only good copy.
  if(validOld){const previous=this.storage.getItem(SAVE_KEYS.previous);if(previous){try{await decryptSave(previous);}catch(error){if(error instanceof UnsupportedSaveError){this.blocked=true;throw error;}}}
   if(generation!==this.generation||this.blocked)return false;if(this.storage.getItem(SAVE_KEYS.current)!==old){this.blocked=true;throw new SaveConflictError();}this.storage.setItem(SAVE_KEYS.previous,old);}
  if(this.storage.getItem(SAVE_KEYS.current)!==old){this.blocked=true;throw new SaveConflictError();}
  const text=JSON.stringify(envelope);this.storage.setItem(SAVE_KEYS.current,text);this.expectedCurrent=text;this.lastSaved=capturedAt;return true;
 }
 async import(text) {
  const state=await decryptSave(text),wasBlocked=this.blocked;this.generation++;await this.queue.catch(()=>{});this.blocked=false;this.expectedCurrent=this.storage.getItem(SAVE_KEYS.current);
  try{if(!await this.save(state,state.savedAt))throw new Error('Importが別の保存処理で中断されました。');return state;}catch(error){this.blocked=wasBlocked||this.blocked;throw error;}
 }
 async backup() {const text=this.storage.getItem(SAVE_KEYS.previous);if(!text)throw new Error('まだバックアップがありません。');return decryptSave(text);}
 async clear() {this.generation++;await this.queue.catch(()=>{});this.storage.removeItem(SAVE_KEYS.current);this.storage.removeItem(SAVE_KEYS.previous);this.blocked=false;this.expectedCurrent=null;}
}
