import {activeRift,riftProductionFactor,riftPriceFactor,chooseRiftFacility,feverTier,rollFever,riftResearchFactor,riftDurationMultiplier,riftIntervalMultiplier} from './rifts.mjs';
import {emptyResearch,parseResearch,rangeContains,addResearch,purchasedMultiplier,legacyFacilityMultiplier,automaticResearchMultiplier,countAt,maxResearchCount,unlockedIndex} from './research.mjs';
import {Huge,H,geometricCost,maxAffordable} from './number.mjs';
import {CONFIG,BUILDINGS,SKILLS,UPGRADES,CLICK_UPGRADES,LEGACY_BUILDING_COUNT,emptyBuildingCounts} from './config.mjs';
import {emptyRmUnlocks,rmUnlockRequirement,prestigeLevelAt,prestigeLevelTarget,milestoneMultiplier} from './prestige.mjs';
import {emptyInfiniteSkills,infiniteSkill,infiniteSkillPrice,infiniteAffordable,infiniteFactor} from './infinite-skills.mjs';
export const NUMBER_FIELDS=['dm','runDM','lifetimeDM','rm','lifetimeRM','dmFacilitySavings','runProducedRM'];
export const HUGE_STATS=['highestDps','clickDM','buildingDM','riftDM','prestigeRM','buildingRM','offlineDM','offlineRM'];
export function freshState(now=Date.now()) {
  return {version:CONFIG.version,createdAt:now,savedAt:now,runStartedAt:now,dm:H(0),runDM:H(0),lifetimeDM:H(0),rm:H(0),lifetimeRM:H(0),dmFacilitySavings:H(0),runProducedRM:H(0),buildings:emptyBuildingCounts(),redBuildings:emptyBuildingCounts(),rmUnlocked:emptyRmUnlocks(),prestigeMilestoneLevel:0,legacyPrestigeMultiplier:1,endless:emptyBuildingCounts(),facilityResearch:emptyResearch(),upgrades:[],skills:[],infiniteSkills:emptyInfiniteSkills(),achievements:[],infinityEarned:0,infinitySpent:0,prestiges:0,runTime:0,playTime:0,activity:{since:now,runSeconds:0,totalSeconds:0},stats:{...Object.fromEntries(HUGE_STATS.map(k=>[k,H(0)])),clicks:0,buildingsBought:0,redBought:0,upgradesBought:0,riftsAppeared:0,riftsClicked:0,offlineSeconds:0,highestBuildings:emptyBuildingCounts(),highestRedBuildings:emptyBuildingCounts(),maxCombo:0},settings:{notation:'standard',motion:true,particles:true},effects:[]};
}
const SKILLS_BY_EFFECT=new Map();for(const skill of SKILLS)if(skill.effect){const group=SKILLS_BY_EFFECT.get(skill.effect)||[];group.push(skill);SKILLS_BY_EFFECT.set(skill.effect,group);}
const a=(id,name,description,category,test,hidden=false)=>({id,name,description,category,test,hidden});
export const ACHIEVEMENTS=[
 ...[1,100,1000,10000,100000].map((v,i)=>a(`click${i}`,['First Contact','Gravitational Grip','Event Horizon','Patient Observer','Unstoppable'][i],`${v.toLocaleString('en-US')} 回クリック`,'クリック',s=>s.stats.clicks>=v)),
 ...[100,1e3,1e4,1e5,1e6,1e8,1e10,1e12,1e15,1e20,1e30,1e50,1e100,1e300].map((v,i)=>a(`dm${i}`,['A Speck of Darkness','Dark Beginnings','Growing Gravity','Quantum Leap','One in a Million','Beyond the Orbit','Stellar Scale','A Trillion Stars','Galactic Reach','Cosmic Architect','Reality Bender','Unfathomable','Infinite Horizon','Beyond Numbers'][i],`Lifetime DM ≥ ${v.toExponential()}`,'生産',s=>s.lifetimeDM.gte(v))),
 ...[1,10,100,1000,1e4,1e6,1e9,1e12,1e20].map((v,i)=>a(`dps${i}`,`Dark Flow ${i+1}`,`最高DM/sec ≥ ${v.toExponential()}`,'生産',s=>s.stats.highestDps.gte(v))),
 ...BUILDINGS.flatMap((b,i)=>[1,25,100].map((v,j)=>a(`facility${i}_${j}`,`${b.name.split(' ')[0]} ${['Pioneer','Expert','Architect'][j]}`,`${b.name} ${v}個を所有`,'施設',s=>s.stats.highestBuildings[i]>=v))),
 ...[10,100,500,1000,5000].map((v,i)=>a(`total${i}`,`Megastructure ${i+1}`,`累計施設購入 ${v}個`,'施設',s=>s.stats.buildingsBought>=v)),
 ...[1,5,25,100].map((v,i)=>a(`prestige${i}`,['A New Universe','Cosmic Rebirth','Endless Cycle','Eternal Return'][i],`Prestige ${v}回`,'永続',s=>s.prestiges>=v)),
 ...[1,100,1e4,1e8,1e15].map((v,i)=>a(`rm${i}`,`Crimson Legacy ${i+1}`,`Lifetime RM ≥ ${v.toExponential()}`,'永続',s=>s.lifetimeRM.gte(v))),
 ...[1,10,100].map((v,i)=>a(`red${i}`,`Permanent Footprint ${i+1}`,`累計永続施設購入 ${v}個`,'永続',s=>s.stats.redBought>=v)),
 ...[1,5,12,25,50].map((v,i)=>a(`im${i}`,`Infinity Awaits ${i+1}`,`Infinity Matter累計 ${v}`,'Infinity',s=>s.infinityEarned>=v)),
 ...[1,5,15,30].map((v,i)=>a(`skill${i}`,`Awakened Mind ${i+1}`,`Skill ${v}個`,'Infinity',s=>s.skills.length>=v)),
 ...[1,10,50,200].map((v,i)=>a(`rift${i}`,`Rift Walker ${i+1}`,`Cosmic Riftを${v}回捕捉`,'裂け目',s=>s.stats.riftsClicked>=v)),
 ...[60,3600,28800].map((v,i)=>a(`offline${i}`,`While You Were Away ${i+1}`,`オフライン生産 ${v/60}分`,'時間',s=>s.stats.offlineSeconds>=v)),
 a('resonant','Red Awakening','最初のRed Resonanceを取得','永続',s=>s.skills.includes('resonance0')),
 a('secret77','Lucky Singularity','77回ブラックホールを観測','隠し',s=>s.stats.clicks>=77,true),
 a('secretcombo','A Steady Hand','連続クリックボーナス +15%を達成','隠し',s=>s.stats.maxCombo>=15,true),
 a('secretred','Second Heartbeat','永続施設からRed Matterを生産','隠し',s=>s.stats.buildingRM.gt(0),true),
 a('secretall','Thirteen Horizons','全13種類の施設を所有','隠し',s=>s.stats.highestBuildings.slice(0,LEGACY_BUILDING_COUNT).every(n=>n>0),true)
];
export class Game {
 constructor(state=freshState(),random=Math.random) {this.state=state;this.random=random;this.listeners=[];this.researchCache=[];this.automaticCache=[];this.researchRevision=0;this.rift=null;this.nextRift=this.riftInterval();this.combo=0;this.lastClick=-Infinity;this.clock=0;this.refresh();}
 onEvent(fn) {this.listeners.push(fn);return()=>this.listeners=this.listeners.filter(f=>f!==fn);}
 emit(type,data={}) {this.listeners.forEach(fn=>fn({type,...data}));}
 skillFactor(effect) {return (SKILLS_BY_EFFECT.get(effect)||[]).filter(k=>this.state.skills.includes(k.id)).reduce((n,k)=>n*k.value,1);}
 skillSum(effect) {return (SKILLS_BY_EFFECT.get(effect)||[]).filter(k=>this.state.skills.includes(k.id)).reduce((n,k)=>n+k.value,0);}
 get comboGain() {return this.comboMax===null&&this.comboValue.gt(CONFIG.comboSoftStart)?H(this.comboStep).mul(CONFIG.comboSoftStart).div(this.comboValue):H(this.comboStep);}
 get combo() {return this.comboValue.toNumber();}
 set combo(value) {this.comboValue=H(value);}
 get comboMultiplier() {return H(1).add(this.comboValue);}
 refresh() {
  const s=this.state,total=s.buildings.reduce((a,b)=>a+b,0)+s.redBuildings.reduce((a,b)=>a+b,0);
  const global=this.skillFactor('production'),rebirth=this.prestigeMultiplier(),flow=infiniteFactor(s,'cosmicFlow'),redAmplification=infiniteFactor(s,'redAmplification'); let dm=H(0),rm=H(0),activeDm=H(0);
  const comboBonuses=[...CLICK_UPGRADES.filter(u=>s.upgrades.includes(u.id)),...SKILLS.filter(k=>s.skills.includes(k.id))];
  this.comboMax=s.infiniteSkills.comboSingularity?null:CONFIG.comboMax+comboBonuses.reduce((sum,item)=>sum+(item.comboMax||0),0)+s.infiniteSkills.comboExpansion*infiniteSkill('comboExpansion').capPerLevel;
  this.comboStep=CONFIG.comboStep+comboBonuses.reduce((sum,item)=>sum+(item.comboStep||0),0)+s.infiniteSkills.comboAscension*infiniteSkill('comboAscension').stepPerLevel+(s.infiniteSkills.comboSingularity?s.infiniteSkills.comboExpansion*infiniteSkill('comboExpansion').unboundedStepPerLevel:0);
  if(this.comboMax!==null)this.comboValue=Huge.min(this.comboValue,this.comboMax);
  this.facilityRates=BUILDINGS.map((b,i)=>{
   let permanent=H(b.rate).mul(CONFIG.productionScale).mul(global).mul(this.skillFactor(`building${i}`));
   let normal=permanent.mul(flow);
   for(let t=0;t<5;t++) if(s.upgrades.includes(`b${i}u${t}`)) {
    normal=normal.mul(legacyFacilityMultiplier(i,t,s.buildings,total));
   }
   const ranges=s.facilityResearch[i];
   if(this.researchCache[i]?.ranges!==ranges)this.researchCache[i]={ranges,multiplier:purchasedMultiplier(ranges)};
   normal=normal.mul(this.researchCache[i].multiplier).mul(H(CONFIG.repeatUpgrade.power).pow(s.endless[i]));
   normal=normal.mul(rebirth);
   const dark=normal.mul(s.buildings[i]);
   // Automatic milestones depend on current counts, never on DM purchases or saved unlocks.
   const owned=s.buildings[i]+s.redBuildings[i];
   const key=`${owned}:${s.buildings[i+1]||0}:${total}`;
   if(this.automaticCache[i]?.key!==key)this.automaticCache[i]={key,multiplier:automaticResearchMultiplier(owned,i,s.buildings,total)};
   const automatic=this.automaticCache[i].multiplier;
   const redCapacity=permanent.mul(this.skillFactor('red')).mul(automatic);
   const redUnit=redCapacity.mul(CONFIG.permanentDmMultiplier).mul(rebirth).mul(flow);
   const red=redUnit.mul(s.redBuildings[i]);
   const resonance=this.skillFactor(`resonance${i}`);
   const rmUnit=redCapacity.mul(CONFIG.permanentRmMultiplier).mul(resonance).mul(redAmplification);
   const redRate=rmUnit.mul(s.redBuildings[i]);
   dm=dm.add(dark).add(red);rm=rm.add(redRate);
   const dmMultiplier=riftProductionFactor(s,i),activeUnit=normal.mul(dmMultiplier),activeRedUnit=redUnit.mul(dmMultiplier),activeDark=dark.mul(dmMultiplier),activeRed=red.mul(dmMultiplier),activeTotal=activeDark.add(activeRed);
   activeDm=activeDm.add(activeTotal);
   const automaticCount=unlockedIndex(owned)+1,nextCount=countAt(automaticCount);
   return {activeUnit,activeDark,activeRedUnit,activeRed,activeTotal,dmMultiplier,unit:normal,dark,red,redUnit,rmUnit,rm:redRate,automatic,automaticCount,nextAutomatic:nextCount<=maxResearchCount?nextCount:null,resonance,total:dark.add(red)};
  });
  this.baseDps=dm;this.rmps=rm;
  this.productionMultiplier=activeRift(s,'surge')?CONFIG.rift.effects.find(e=>e.id==='surge').production:1;
  this.dps=activeDm;
  let click=H(CONFIG.baseClick).mul(this.skillFactor('click')).mul(rebirth),fraction=this.skillSum('clickDps');
  for(const u of CLICK_UPGRADES) if(s.upgrades.includes(u.id)) {if(u.mult) click=click.mul(u.mult);fraction+=u.dps||0;}
  click=click.add(dm.mul(fraction));
  click=click.mul(infiniteFactor(s,'eternalTouch'));this.baseClick=click;
  this.clickPower=click;
  if(activeRift(s,'frenzy')){this.clickPower=this.clickPower.mul(feverTier(activeRift(s,'frenzy')).click);for(const u of CLICK_UPGRADES)if(u.rift&&s.upgrades.includes(u.id))this.clickPower=this.clickPower.mul(u.rift);}
  s.stats.highestDps=Huge.max(s.stats.highestDps,this.dps);
 }
 get infinity() {return this.state.infinityEarned-this.state.infinitySpent;}
 get infinityGoal() {return H(CONFIG.infinity.first).mul(H(CONFIG.infinity.growth).pow(this.state.infinityEarned));}
 get infinityProgress() {return Math.max(0,Math.min(1,this.state.lifetimeDM.div(this.infinityGoal).toNumber()));}
 get offlineEfficiency() {return CONFIG.offline.efficiency+this.skillSum('offline');}
 get offlineHours() {return CONFIG.offline.hours+this.skillSum('offlineHours');}
 riftInterval() {return Math.max(CONFIG.rift.minimumInterval,(CONFIG.rift.minInterval+this.random()*(CONFIG.rift.maxInterval-CONFIG.rift.minInterval))*riftIntervalMultiplier(this.state));}
 awardDM(amount,source='building') {const s=this.state;amount=H(amount);s.dm=s.dm.add(amount);s.runDM=s.runDM.add(amount);s.lifetimeDM=s.lifetimeDM.add(amount);const key={click:'clickDM',building:'buildingDM',rift:'riftDM',offline:'offlineDM'}[source];if(key)s.stats[key]=s.stats[key].add(amount);}
 awardRM(amount,source='building') {const s=this.state;amount=H(amount);s.rm=s.rm.add(amount);s.lifetimeRM=s.lifetimeRM.add(amount);if(source==='building'||source==='offline')s.runProducedRM=s.runProducedRM.add(amount);const key={building:'buildingRM',prestige:'prestigeRM',offline:'offlineRM'}[source];if(key)s.stats[key]=s.stats[key].add(amount);}
 checkProgress() {
  const s=this.state;
  if(s.lifetimeDM.gte(CONFIG.infinity.first)) {
   const earned=Math.max(s.infinityEarned,Math.floor((s.lifetimeDM.log10()-Math.log10(CONFIG.infinity.first))/Math.log10(CONFIG.infinity.growth)+1e-10)+1);
   if(earned>s.infinityEarned) {const count=earned-s.infinityEarned;s.infinityEarned=earned;this.emit('infinity',{count});}
  }
  for(const achievement of ACHIEVEMENTS) if(!s.achievements.includes(achievement.id)&&achievement.test(s)) {s.achievements.push(achievement.id);this.emit('achievement',{achievement});}
 }
 click() {
  const s=this.state;this.comboValue=this.clock-this.lastClick<CONFIG.comboWindow?this.comboValue.add(this.comboGain):H(0);
  if(this.comboMax!==null)this.comboValue=Huge.min(this.comboValue,this.comboMax);
  this.lastClick=this.clock;const amount=this.clickPower.mul(this.comboMultiplier);this.awardDM(amount,'click');s.stats.clicks=Math.min(Number.MAX_SAFE_INTEGER,s.stats.clicks+1);s.stats.maxCombo=Math.max(s.stats.maxCombo,Math.min(Number.MAX_SAFE_INTEGER,Math.round(this.comboValue.mul(100).floor().toNumber())));this.checkProgress();this.emit('click',{amount});return amount;
 }
 cost(i,currency='dm',n=1) {const b=BUILDINGS[i],red=currency==='rm';return geometricCost(red?b.redCost:H(b.cost).mul(riftPriceFactor(this.state)),red?CONFIG.rmGrowth:CONFIG.dmGrowth,(red?this.state.redBuildings:this.state.buildings)[i],n);}
 isRmUnlocked(i) {return this.state.rmUnlocked[i]===true;}
 affordable(i,currency='dm') {const b=BUILDINGS[i],red=currency==='rm';if(red&&!this.isRmUnlocked(i))return 0;return maxAffordable(this.state[currency],red?b.redCost:H(b.cost).mul(riftPriceFactor(this.state)),red?CONFIG.rmGrowth:CONFIG.dmGrowth,(red?this.state.redBuildings:this.state.buildings)[i],CONFIG.maxBuildingCount);}
 buy(i,currency='dm',count=1) {
  if(!BUILDINGS[i]||!['dm','rm'].includes(currency)) return false;
  if(currency==='rm'&&!this.isRmUnlocked(i))return false;
  const s=this.state,owned=currency==='rm'?s.redBuildings:s.buildings;
  const n=count==='max'?this.affordable(i,currency):count;
  if(!Number.isSafeInteger(n)||n<1||n+owned[i]>CONFIG.maxBuildingCount) return false;
  const cost=this.cost(i,currency,n);if(!s[currency].gte(cost)) return false;
  s[currency]=s[currency].sub(cost);owned[i]+=n;s.stats.buildingsBought=Math.min(Number.MAX_SAFE_INTEGER,s.stats.buildingsBought+n);
  if(currency==='rm') {s.stats.redBought=Math.min(Number.MAX_SAFE_INTEGER,s.stats.redBought+n);s.stats.highestRedBuildings[i]=Math.max(s.stats.highestRedBuildings[i],owned[i]);}
  else {s.stats.highestBuildings[i]=Math.max(s.stats.highestBuildings[i],owned[i]);const full=geometricCost(BUILDINGS[i].cost,CONFIG.dmGrowth,owned[i]-n,n);s.dmFacilitySavings=s.dmFacilitySavings.add(full.sub(cost));}
  this.refresh();this.checkProgress();this.emit('purchase',{building:i,count:n,currency});return n;
 }
 getUpgrade(id) {return UPGRADES.find(u=>u.id===id)||parseResearch(id);}
 upgradeAvailable(u) {if(!u)return false;const s=this.state;return !(u.generated?rangeContains(s.facilityResearch[u.building],u.index):s.upgrades.includes(u.id))&&(!u.requires||s.upgrades.includes(u.requires))&&(u.building!==undefined?s.buildings[u.building]+s.redBuildings[u.building]>=u.amount:s.runDM.gte(u.unlock));}
 buyUpgrade(id) {
  const u=this.getUpgrade(id);if(!u||!this.upgradeAvailable(u)||!this.state.dm.gte(u.cost)) return false;
  this.state.dm=this.state.dm.sub(u.cost);if(u.generated){this.state.facilityResearch[u.building]=addResearch(this.state.facilityResearch[u.building],u.index);this.researchRevision++;}else this.state.upgrades.push(id);this.state.stats.upgradesBought=Math.min(Number.MAX_SAFE_INTEGER,this.state.stats.upgradesBought+1);this.refresh();this.checkProgress();this.emit('upgrade',{upgrade:u});return true;
 }
 repeatCost(i) {return H(BUILDINGS[i].cost).mul(CONFIG.repeatUpgrade.costFactor).mul(H(CONFIG.repeatUpgrade.growth).pow(this.state.endless[i]));}
 buyRepeat(i) {const s=this.state;if(!BUILDINGS[i]||s.buildings[i]+s.redBuildings[i]<CONFIG.repeatUpgrade.requirement||!s.dm.gte(this.repeatCost(i))||s.endless[i]>=1e9)return false;s.dm=s.dm.sub(this.repeatCost(i));s.endless[i]++;s.stats.upgradesBought=Math.min(Number.MAX_SAFE_INTEGER,s.stats.upgradesBought+1);this.refresh();return true;}
 skillAvailable(k) {return !this.state.skills.includes(k.id)&&this.state.infinityEarned>=k.earned&&(!k.requires||this.state.skills.includes(k.requires));}
 buySkill(id) {const k=SKILLS.find(k=>k.id===id);if(!k||!this.skillAvailable(k)||this.infinity<k.cost)return false;this.state.infinitySpent+=k.cost;this.state.skills.push(id);this.refresh();this.checkProgress();this.emit('skill',{skill:k});return true;}
 buyInfiniteSkill(id,expectedLevel=this.state.infiniteSkills[id]+1) {
  const k=infiniteSkill(id),level=this.state.infiniteSkills[id]+1;if(!k||expectedLevel!==level||!infiniteAffordable(this,id))return false;
  const price=infiniteSkillPrice(id,level);this.state.infinitySpent+=price.units;this.state.infiniteSkills[id]=level;this.refresh();this.checkProgress();this.emit('infiniteSkill',{skill:k,level});return true;
 }
 // Only a new completed-run record grows the multiplier; migrated floors are immutable.
 prestigeMultiplier(level=this.state.prestigeMilestoneLevel) {return Math.max(this.state.legacyPrestigeMultiplier,milestoneMultiplier(level));}
 prestigePreview() {const s=this.state,level=Math.max(s.prestigeMilestoneLevel,prestigeLevelAt(s.runDM));return {level,multiplier:this.prestigeMultiplier(level),newUnlocks:BUILDINGS.filter(b=>!this.isRmUnlocked(b.id)&&s.runDM.gte(rmUnlockRequirement(b.id))).map(b=>b.id)};}
 nextPrestigeMilestone() {const level=this.state.prestigeMilestoneLevel+1;return {level,target:level<=1e15-5?prestigeLevelTarget(level):null};}
 postPrestigeRates() {
  const s=this.state,preview=this.prestigePreview();
  // Derive from the same production engine. No reward, RNG draw or source mutation.
  const projected={...s,buildings:emptyBuildingCounts(),endless:emptyBuildingCounts(),facilityResearch:emptyResearch(),upgrades:[],effects:[],prestigeMilestoneLevel:preview.level,stats:{...s.stats}};
  const key=[s.redBuildings.join(','),s.skills.join(','),Object.values(s.infiniteSkills).join(','),preview.level,s.legacyPrestigeMultiplier].join('|');
  if(this.projectedCache?.key===key)return this.projectedCache.rates;
  const game=new Game(projected,()=>.5),rates={dmps:game.baseDps,rmps:game.rmps};this.projectedCache={key,rates};return rates;
 }
 prestigeRewardParts() {const dm=this.state.runDM.lt(CONFIG.prestige.threshold)?H(0):this.state.runDM.div(CONFIG.prestige.threshold).pow(CONFIG.prestige.power).mul(CONFIG.prestige.base),automatic=this.state.runDM.lt(CONFIG.prestige.threshold)?H(0):this.state.runProducedRM.mul(CONFIG.prestige.runRmRewardShare);return {dm,automatic,factor:this.prestigeRewardFactor()};}
 prestigeRewardFactor() {return H(this.skillFactor('prestige')).mul(infiniteFactor(this.state,'prestigeLegacy'));}
 prestigeRewardAt(produced) {produced=H(produced);if(produced.lt(CONFIG.prestige.threshold))return H(0);return produced.div(CONFIG.prestige.threshold).pow(CONFIG.prestige.power).mul(CONFIG.prestige.base).add(this.state.runProducedRM.mul(CONFIG.prestige.runRmRewardShare)).mul(this.prestigeRewardFactor()).floor();}
 prestigeReward() {return this.prestigeRewardAt(this.state.runDM);}
 nextPrestigeReward() {
  const produced=this.state.runDM,current=this.prestigeReward();
  let reward=current.add(1);
  // Huge numbers cannot represent a single unit at large exponents. Use a representable increase.
  if(reward.eq(current))reward=current.mul(1+1e-12).floor();
  let target=Huge.max(H(CONFIG.prestige.threshold),reward.div(this.prestigeRewardFactor()).sub(this.state.runProducedRM.mul(CONFIG.prestige.runRmRewardShare)).div(CONFIG.prestige.base).pow(1/CONFIG.prestige.power).mul(CONFIG.prestige.threshold));
  if(this.prestigeRewardAt(target).lt(reward))target=target.mul(1+1e-12);
  if(target.lte(produced))target=produced.mul(1+1e-12);
  return {reward:this.prestigeRewardAt(target),target,remaining:target.sub(produced)};
 }
 canPrestige() {return this.state.runTime>=CONFIG.prestige.minRunSeconds&&this.prestigeReward().gte(1);}
 prestige(now=Date.now()) {
  if(!this.canPrestige())return false;
  const reward=this.prestigeReward(),s=this.state,preview=this.prestigePreview();s.prestigeMilestoneLevel=preview.level;for(const id of preview.newUnlocks)s.rmUnlocked[id]=true;this.awardRM(reward,'prestige');s.prestiges++;s.dm=H(0);s.runDM=H(0);s.dmFacilitySavings=H(0);s.runProducedRM=H(0);s.buildings=emptyBuildingCounts();s.endless=emptyBuildingCounts();s.facilityResearch=emptyResearch();this.researchRevision++;s.upgrades=[];s.effects=[];s.runTime=0;s.activity.runSeconds=0;s.runStartedAt=now;this.combo=0;this.rift=null;this.nextRift=this.riftInterval();this.refresh();this.checkProgress();this.emit('prestige',{reward,newUnlocks:preview.newUnlocks,level:preview.level});return reward;
 }
 spawnRift() {this.rift={remaining:CONFIG.rift.visibleSeconds*this.skillFactor('riftDuration'),x:.12+this.random()*.72,y:.18+this.random()*.58};this.state.stats.riftsAppeared++;this.emit('rift');}
 catchRift() {
  if(!this.rift)return false;
  this.rift=null;const s=this.state;s.stats.riftsClicked++;
  const total=CONFIG.rift.effects.reduce((n,e)=>n+e.weight,0);let r=this.random()*total;
  const effect=CONFIG.rift.effects.find(e=>(r-=e.weight)<0)||CONFIG.rift.effects[0];
  if(effect.cacheSeconds) {const gain=Huge.max(this.baseDps,H(CONFIG.rift.minimumBurstDps)).mul(effect.cacheSeconds).mul(this.skillFactor('cache')).mul(riftResearchFactor(s,'fortune'));this.awardDM(gain,'rift');this.emit('riftReward',{effect,gain});}
  else {
   const existing=s.effects.find(e=>e.id===effect.id),fever=effect.id==='frenzy'?rollFever(s,this.random):null,seconds=(fever?.seconds??effect.seconds)*riftDurationMultiplier(s);
   const target=effect.facilityProduction?chooseRiftFacility(s,this.random,this.facilityRates.map(r=>r.total.div(this.baseDps.m?this.baseDps:H(1)).toNumber())):undefined;
   if(existing){existing.remaining=fever?seconds:Math.max(existing.remaining,seconds);if(target!==undefined)existing.target=target;if(fever)existing.tier=fever.id;}
   else s.effects.push({id:effect.id,remaining:seconds,...(fever?{tier:fever.id}:{}),...(target===undefined?{}:{target})});
   this.emit('riftReward',{effect:fever?{...effect,name:fever.name,label:`クリック ×${fever.click}`,tier:fever.id}:effect,target,seconds:existing?.remaining??seconds});
  }
  this.refresh();this.checkProgress();return effect;
 }
 tick(seconds) {
  if(!Number.isFinite(seconds)||seconds<=0)return;
  const s=this.state;this.clock+=seconds;s.runTime+=seconds;s.playTime+=seconds;
  if(this.clock-this.lastClick>=CONFIG.comboWindow)this.combo=0;
  // At most four effect boundaries, independent of elapsed time.
  const boundaries=[...new Set(s.effects.map(e=>e.remaining).filter(t=>t>0&&t<seconds))].sort((a,b)=>a-b);boundaries.push(seconds);
  let previous=0;
  for(const end of boundaries) {
   const dt=end-previous;this.refresh();this.awardDM(this.dps.mul(dt),'building');this.awardRM(this.rmps.mul(dt),'building');
   s.effects=s.effects.map(e=>({...e,remaining:e.remaining-dt})).filter(e=>e.remaining>1e-8);previous=end;
  }
  if(this.rift){this.rift.remaining-=seconds;if(this.rift.remaining<=0){this.rift=null;this.emit('riftExpired');}}
  this.nextRift-=seconds;if(this.nextRift<=0){if(!this.rift)this.spawnRift();this.nextRift=this.riftInterval();}
  this.refresh();this.checkProgress();
 }
 applyOffline(seconds,remainingCap=this.offlineHours*3600) {
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(remainingCap)||remainingCap<0)return null;
  this.state.effects=[];this.combo=0;this.lastClick=-Infinity;this.refresh();
  const credited=Math.min(seconds,this.offlineHours*3600,remainingCap),dm=this.baseDps.mul(credited*this.offlineEfficiency),rm=this.rmps.mul(credited*this.offlineEfficiency);
  this.awardDM(dm,'offline');this.awardRM(rm,'offline');this.state.stats.offlineSeconds+=credited;this.state.runTime+=seconds;this.state.playTime+=credited;this.rift=null;this.nextRift=this.riftInterval();this.refresh();this.checkProgress();return {seconds,credited,dm,rm,efficiency:this.offlineEfficiency};
 }
 hydrateEffects() {this.state.effects=[];this.rift=null;this.combo=0;this.lastClick=-Infinity;this.refresh();}
}
