import {CONFIG,BUILDINGS,FACILITY_UPGRADES} from './config.mjs';
import {H,Huge} from './number.mjs';

// Ordinals order milestones without allocating a catalog. Legacy IDs stay separate.
export const EARLY_COUNTS=[10,25,50,100];
const EARLY_MULTIPLIERS=[2,2,2,2,1.5,2,1.75,2,2.5,8/3,17/6,3,3,3,3,3,3,3.4,3.8,4.2,4.6,5];
const legacyByBuilding=BUILDINGS.map(b=>FACILITY_UPGRADES.filter(u=>u.building===b.id));
export const emptyResearch=()=>BUILDINGS.map(()=>[]);
export const maxResearchCount=CONFIG.maxBuildingCount*2;
export const countAt=index=>index<4?EARLY_COUNTS[index]:(index-1)*50;
export function indexAt(count){if(EARLY_COUNTS.includes(count))return EARLY_COUNTS.indexOf(count);return Number.isSafeInteger(count)&&count>=150&&count%50===0?count/50+1:-1;}
export function unlockedIndex(owned){if(owned>=150)return Math.floor(owned/50)+1;for(let i=3;i>=0;i--)if(owned>=EARLY_COUNTS[i])return i;return -1;}
export const isNewIndex=index=>Number.isSafeInteger(index)&&index>=4&&index!==5&&countAt(index)<=maxResearchCount;
export const researchMultiplier=count=>{const index=indexAt(count);if(index<0)return null;return index<EARLY_MULTIPLIERS.length?EARLY_MULTIPLIERS[index]:5+(count-1000)/500;};
export const researchId=(building,count)=>`f${building}:${count}`;
export function researchPrice(building,count,k=CONFIG.facilityResearch.priceK){
 const b=BUILDINGS[building],multiplier=researchMultiplier(count);
 if(!b||!isNewIndex(indexAt(count)))return null;
 return H(b.cost).mul(H(CONFIG.dmGrowth).pow(count)).mul(k*(multiplier-1));
}
export function researchSpec(building,count){
 const b=BUILDINGS[building];if(!b)return null;
 const legacy=legacyByBuilding[building].find(u=>u.amount===count);if(legacy)return legacy;
 if(!isNewIndex(indexAt(count)))return null;
 const major=count>=1000&&count%250===0;
 return {id:researchId(building,count),building,amount:count,index:indexAt(count),multiplier:researchMultiplier(count),cost:researchPrice(building,count),name:`${b.name} · ${count.toLocaleString('en-US')}基研究`,description:'通常DM施設の生産を強化',generated:true,major};
}
export function parseResearch(id){const match=/^f(\d+):(\d+)$/.exec(id);if(!match)return null;const spec=researchSpec(Number(match[1]),Number(match[2]));return spec?.generated&&spec.id===id?spec:null;}
export function rangeContains(ranges,index){let lo=0,hi=ranges.length-1;while(lo<=hi){const mid=Math.floor((lo+hi)/2),[start,end]=ranges[mid];if(index<start)hi=mid-1;else if(index>end)lo=mid+1;else return true;}return false;}
export function addResearch(ranges,index){
 const result=[];let start=index,end=index,inserted=false;
 for(const [a,b] of ranges){if(b+1<start)result.push([a,b]);else if(end+1<a){if(!inserted){result.push([start,end]);inserted=true;}result.push([a,b]);}else{start=Math.min(start,a);end=Math.max(end,b);}}
 if(!inserted)result.push([start,end]);return result;
}
export const rangeCount=ranges=>ranges.reduce((sum,[a,b])=>sum+b-a+1,0);
export const endlessAffordable=(game,id)=>game.state.buildings[id]+game.state.redBuildings[id]>=CONFIG.repeatUpgrade.requirement&&game.state.endless[id]<1e9&&game.state.dm.gte(game.repeatCost(id));
function firstMissing(ranges,index){for(const [start,end] of ranges){if(index===5)index=6;if(index<start)break;if(index<=end)index=end+1;}return index===5?6:index;}
export function researchChoices(game,building,limit=CONFIG.facilityResearch.visibleLimit){
 const s=game.state,owned=s.buildings[building]+s.redBuildings[building],last=unlockedIndex(owned),ranges=s.facilityResearch[building];
 const choices=legacyByBuilding[building].filter(u=>!s.upgrades.includes(u.id)&&u.amount<=owned);
 let index=firstMissing(ranges,4);
 for(let n=0;n<limit&&index<=last;n++){choices.push(researchSpec(building,countAt(index)));index=firstMissing(ranges,index+1);}
 return choices.sort((a,b)=>H(a.cost).cmp(b.cost)).slice(0,limit);
}
export function nextResearch(building,owned){const index=unlockedIndex(owned)+1,count=countAt(index);return count<=maxResearchCount?researchSpec(building,count):null;}
export function researchHistory(game,building,limit=CONFIG.facilityResearch.historyLimit){
 const s=game.state,list=legacyByBuilding[building].filter(u=>s.upgrades.includes(u.id)),ranges=s.facilityResearch[building];
 for(let r=ranges.length-1,n=0;r>=0&&n<limit;r--)for(let i=ranges[r][1];i>=ranges[r][0]&&n<limit;i--,n++)list.push(researchSpec(building,countAt(i)));
 return list.sort((a,b)=>b.amount-a.amount).slice(0,limit);
}

// Stirling difference using log1p avoids subtracting two huge, nearly equal log-Gammas.
const correction=x=>1/(12*x)-1/(360*x**3)+1/(1260*x**5)-1/(1680*x**7);
export const halfResearchMultiplier=multiplier=>1+(multiplier-1)/2;
function rangeLogMultiplier(start,end,half=false){
 let log=0;while(start<=end&&start<22){log+=Math.log10(half?halfResearchMultiplier(EARLY_MULTIPLIERS[start]):EARLY_MULTIPLIERS[start]);start++;}
 const n=end-start+1;if(n<=0)return log;
 const offset=half?39:29,divisor=half?20:10;
 if(n<=64){for(let i=start;i<=end;i++)log+=Math.log10((i+offset)/divisor);return log;}
 const x=start+offset;
 return log+(n*Math.log(x+n)+(x-.5)*Math.log1p(n/x)-n+correction(x+n)-correction(x))/Math.LN10-n*Math.log10(divisor);
}
export function purchasedMultiplier(ranges){if(!ranges.length)return H(1);return Huge.pow10(ranges.reduce((log,[a,b])=>log+rangeLogMultiplier(a,b),0));}
// Legacy bonus factors are part of each individual milestone, before halving its gain.
export function legacyFacilityMultiplier(building,tier,counts,total){return 2*(tier===2?1+(counts[building+1]||0)*.01:tier===4?1+total*.0004:1);}
export function automaticResearchMultiplier(owned,building,counts,total){
 const last=unlockedIndex(owned);let factor=H(1);
 for(let index=0;index<=Math.min(last,21);index++){
  const tier=index<4?index:index===5?4:null;
  const m=tier===null?researchMultiplier(countAt(index)):legacyFacilityMultiplier(building,tier,counts,total);
  factor=factor.mul(halfResearchMultiplier(m));
 }
 return last>=22?factor.mul(Huge.pow10(rangeLogMultiplier(22,last,true))):factor;
}
export function purchasedCost(building,ranges){
 let total=H(0);
 for(let [start,end] of ranges){
  while(start<=end&&start<22){total=total.add(researchPrice(building,countAt(start)));start++;}
  if(start>end)continue;
  // Reverse the arithmetico-geometric sum; inverse powers quickly approach zero.
  const n=end-start+1,r=1/CONFIG.dmGrowth**50,rn=r**n,s0=(1-rn)/(1-r),s1=(r-n*rn+(n-1)*rn*r)/(1-r)**2;
  const base=H(BUILDINGS[building].cost).mul(H(CONFIG.dmGrowth).pow(countAt(end))),k=CONFIG.facilityResearch.priceK;
  total=total.add(base.mul(k*((researchMultiplier(countAt(end))-1)*s0-.1*s1)));
 }
 return total;
}
