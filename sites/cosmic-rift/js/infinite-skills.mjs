import {INFINITE_SKILLS,MAX_COMBO_PERCENT} from './config.mjs';
import {H} from './number.mjs';

export const emptyInfiniteSkills=()=>Object.fromEntries(INFINITE_SKILLS.map(k=>[k.id,0]));
export const infiniteSkill=id=>INFINITE_SKILLS.find(k=>k.id===id);
// IM counters remain exact native integers. Even at Huge's exponent limit, earned IM < 1.3e15.
// Beyond the last possible safe-integer IM price, retain only the Huge display value.
const exactPriceLimit=k=>k.special?1:k.maxLevel??Math.ceil(Math.log(Number.MAX_SAFE_INTEGER/k.baseCost)/Math.log(k.growth))+2;
export function infiniteSkillPrice(id,level){
 const k=infiniteSkill(id);if(!k||!Number.isSafeInteger(level)||level<1||level>(k.maxLevel??(k.special?1:Infinity)))return null;
 if(k.priceStep){const value=k.baseCost+k.priceStep*(level-1);return {amount:H(value),units:value};}
 if(level<=exactPriceLimit(k)){const n=BigInt(Math.round(k.growth*100))**BigInt(level-1),d=100n**BigInt(level-1),value=(BigInt(k.baseCost)*n+d-1n)/d;return {amount:H(value.toString()),units:value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):null};}
 const exponent=Math.log10(k.baseCost)+Math.log10(k.growth)*(level-1);
 if(!Number.isFinite(exponent)||exponent>1e15)return null;
 return {amount:H(k.baseCost).mul(H(k.growth).pow(level-1)),units:null};
}
export function infiniteSeriesSpent(id,level){
 const k=infiniteSkill(id);if(!k||!Number.isSafeInteger(level)||level<0||level>(k.maxLevel??(k.special?1:Infinity))||level>exactPriceLimit(k))return null;
 if(k.priceStep)return level*(2*k.baseCost+(level-1)*k.priceStep)/2;let n=BigInt(k.baseCost),d=1n,total=0n;
 for(let i=0;i<level;i++){total+=(n+d-1n)/d;n*=BigInt(Math.round(k.growth*100));d*=100n;}
 return total<=BigInt(Number.MAX_SAFE_INTEGER)?Number(total):null;
}
export function infiniteAvailable(state,id){
 const k=infiniteSkill(id);if(!k||(k.requires&&!state.skills.includes(k.requires))||state.infiniteSkills[id]>=(k.maxLevel??Infinity))return false;
 if(k.special)return state.infiniteSkills[id]===0&&state.infiniteSkills.comboAscension>=k.requiredSeriesLevel&&state.infiniteSkills.comboExpansion>=k.requiredSeriesLevel;
 return Number.isSafeInteger(state.infiniteSkills[id]+1);
}
export function infiniteAffordable(game,id){const price=infiniteSkillPrice(id,game.state.infiniteSkills[id]+1);return infiniteAvailable(game.state,id)&&price?.units!==null&&price?.units!==undefined&&game.infinity>=price.units;}
export const infiniteFactor=(state,id)=>H(infiniteSkill(id).power).pow(state.infiniteSkills[id]);
export const riftMasteryDuration=state=>1+infiniteSkill('riftMastery').durationPerLevel*state.infiniteSkills.riftMastery;
export const maxComboRecord=state=>state.infiniteSkills.comboSingularity?Number.MAX_SAFE_INTEGER:Math.min(Number.MAX_SAFE_INTEGER,MAX_COMBO_PERCENT+state.infiniteSkills.comboExpansion*(infiniteSkill('comboExpansion').capPerLevel*100));
export function validateInfiniteSkills(state){
 const levels=state.infiniteSkills;if(!levels||Object.keys(levels).length!==INFINITE_SKILLS.length||Object.keys(levels).some(id=>!infiniteSkill(id)))throw Error('Invalid skill levels');
 let spent=0;
 for(const k of INFINITE_SKILLS){const level=levels[k.id];if(!Number.isSafeInteger(level)||level<0||(level>(k.maxLevel??(k.special?1:Infinity))))throw Error('Invalid skill level');
  if(level&&(k.requires&&!state.skills.includes(k.requires)||(k.special&&(levels.comboAscension<k.requiredSeriesLevel||levels.comboExpansion<k.requiredSeriesLevel))))throw Error('Invalid skill prerequisite');
  const cost=infiniteSeriesSpent(k.id,level);if(cost===null||!Number.isSafeInteger(spent+cost))throw Error('Unfunded skill level');spent+=cost;
 }
 return spent;
}
export function migrateInfiniteSkills(raw){if(Object.hasOwn(raw,'infiniteSkills'))throw Error('Unexpected infinite skills');return {...raw,version:6,infiniteSkills:Object.fromEntries(INFINITE_SKILLS.slice(0,8).map(k=>[k.id,0]))};}
