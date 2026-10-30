import {CONFIG,BUILDINGS,SKILLS,RIFT_RESEARCH,FEVER_TIERS,FEVER_LUCK,FEVER_EVOLUTION} from './config.mjs';
import {riftMasteryDuration} from './infinite-skills.mjs';

// Keep temporary targets separate from permanent production and research.
export const activeRift=(state,id)=>state.effects.find(e=>e.id===id&&e.remaining>0);
export function riftProductionFactor(state,facility){
 const fever=activeRift(state,'surge'),target=activeRift(state,'facility');
 return (fever?CONFIG.rift.effects.find(e=>e.id==='surge').production:1)*(target?.target===facility?CONFIG.rift.effects.find(e=>e.id==='facility').facilityProduction:1);
}
export const riftPriceFactor=state=>activeRift(state,'market')?CONFIG.rift.effects.find(e=>e.id==='market').price:1;
export function chooseRiftFacility(state,random,contributions){
 const owned=BUILDINGS.filter(b=>state.buildings[b.id]+state.redBuildings[b.id]>0);
 const pool=owned.length?owned:BUILDINGS;
 if(!owned.length)return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id;
 // Square-root weighting retains variety without repeatedly favoring negligible output.
 const rates=pool.map(b=>state.buildings[b.id]+state.redBuildings[b.id]),peak=Math.max(...rates);
 // The engine supplies constant DM contribution; plain counts are a fallback for callers.
 const powers=pool.map((b,i)=>contributions?.[b.id]??rates[i]/peak);
 const weights=powers.map(p=>Math.sqrt(Math.max(0,p))+.02/pool.length),total=weights.reduce((a,b)=>a+b,0);let roll=random()*total;
 return pool[weights.findIndex((w)=>(roll-=w)<0)]?.id??pool.at(-1).id;
}
export const FEVER_PRIORITY=['surge','frenzy','facility','market'];
export const feverColor=state=>{const id=FEVER_PRIORITY.find(id=>activeRift(state,id));return id==='frenzy'&&activeRift(state,id).tier&&activeRift(state,id).tier!=='normal'?`frenzy-${activeRift(state,id).tier}`:id||'';};
export const riftResearchFactor=(state,key)=>RIFT_RESEARCH.filter(u=>u[key]&&state.upgrades.includes(u.id)).reduce((n,u)=>n*u[key],1);
export const feverTier=effect=>FEVER_TIERS.find(t=>t.id===(effect?.tier??'normal'));
export function feverProbabilities(state,level=state.infiniteSkills.feverEvolution){
 if(level>0)return FEVER_EVOLUTION[level];
 const luck=Math.max(0,...RIFT_RESEARCH.filter(u=>u.luck&&state.upgrades.includes(u.id)).map(u=>u.luck));return FEVER_LUCK[luck];
}
export function feverRanges(state){return FEVER_TIERS.map(t=>({...t,min:state.infiniteSkills.temporalStabilization?t.stableMin:t.min,max:state.infiniteSkills.temporalExpansion?t.expandedMax:t.max}));}
export function rollFever(state,random){
 const weights=feverProbabilities(state);let roll=random()*100;
 const tier=feverRanges(state)[Math.max(0,weights.findIndex(w=>(roll-=w)<0))];
 return {...tier,seconds:tier.min+Math.min(tier.max-tier.min,Math.floor(random()*(tier.max-tier.min+1)))};
}
export const riftDurationMultiplier=state=>SKILLS.filter(k=>k.effect==='effectDuration'&&state.skills.includes(k.id)).reduce((n,k)=>n*k.value,1)*riftMasteryDuration(state)*riftResearchFactor(state,'duration');
export const riftIntervalMultiplier=state=>SKILLS.filter(k=>k.effect==='riftFrequency'&&state.skills.includes(k.id)).reduce((n,k)=>n*k.value,1)*riftResearchFactor(state,'interval')*Math.pow(.95,state.infiniteSkills.riftAcceleration);

export function riftEffectText(effect){
 const spec=CONFIG.rift.effects.find(e=>e.id===effect.id);
 if(effect.id==='frenzy'){const tier=feverTier(effect);return `${tier.name} ×${tier.click} · クリック`; }
 return `${spec.name} · ${spec.label}${effect.id==='facility'?` · ${BUILDINGS[effect.target].name}`:''}`;
}
