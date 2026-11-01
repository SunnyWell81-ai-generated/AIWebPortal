import {CONFIG,SKILLS,INFINITE_SKILLS} from './config.mjs';
import {H} from './number.mjs';
import {infiniteSkillPrice,infiniteAvailable,infiniteAffordable} from './infinite-skills.mjs';
import {feverProbabilities,feverRanges,riftDurationMultiplier} from './rifts.mjs';
import {shopCard,syncShopCard,availableMarkup,updateAvailable,retainShopPosition} from './shop-ui.mjs';
const title={all:'すべて',rift:'Rift育成',infinite:'無限スキル',combo:'コンボ専用',fixed:'既存の固定Skill'};
const models=new WeakMap();
export function skillEffectText(k,level,state,fmt){
 if(k.id==='feverEvolution')return `Normal / Rare / Legendary：${feverProbabilities(state,level).join('% / ')}%`;
 if(k.id==='riftAcceleration')return `間隔 ×${Number(Math.pow(.95,level).toPrecision(4))} · 最低10秒`;
 if(k.id==='temporalExpansion'||k.id==='temporalStabilization'){
  const preview={...state,infiniteSkills:{...state.infiniteSkills,[k.id]:level}},duration=riftDurationMultiplier(preview);
  return feverRanges(preview).map(t=>`${t.name.split(' ')[0]} ${t.min}–${t.max}秒${duration===1?'':` → ${fmt(t.min*duration)}–${fmt(t.max*duration)}秒`}`).join(' / ');
 }
 if(k.power)return `×${fmt(H(k.power).pow(level))}`;
 if(k.durationPerLevel)return `持続時間 ×${fmt(1+k.durationPerLevel*level)}`;
 if(k.stepPerLevel)return `コンボ増加量 +${fmt(H(k.stepPerLevel).mul(level).mul(100))}ポイント`;
 if(k.capPerLevel)return state.infiniteSkills.comboSingularity?`増加量 +${fmt(H(k.unboundedStepPerLevel).mul(level).mul(100))}ポイント（上限なし）`:`コンボ上限 +${fmt(H(k.capPerLevel).mul(level).mul(100))}ポイント`;
 return level?`上限なし · +${CONFIG.comboSoftStart*100}%から緩やかに成長`:'上限あり';
}
export function skillsViewModel(game){return INFINITE_SKILLS.map(k=>{const level=game.state.infiniteSkills[k.id],next=level+1;return {skill:k,level,next,price:infiniteSkillPrice(k.id,next),available:infiniteAvailable(game.state,k.id),owned:level>=(k.maxLevel??(k.special?1:Infinity))};});}

export function skillCatalog(game,fmt){
 const fixed=SKILLS.map(k=>{const owned=game.state.skills.includes(k.id),unlocked=game.skillAvailable(k),status=owned?'owned':!unlocked?'locked':game.infinity>=k.cost?'available':'poor';return {key:`skill:${k.id}`,kind:'skill',id:k.id,group:'fixed',name:k.name,category:`固定Skill · ${k.category}`,effect:k.description,current:owned?'適用中':'未取得',next:owned?'':k.description,levelLabel:owned?'恒久取得済み':'一度きり・恒久',price:H(k.cost),currency:'IM',status,requirement:`累計IM ${k.earned}${k.requires?` · 前提：${SKILLS.find(x=>x.id===k.requires).name}`:''}`,shortfall:status==='poor'?`あと ${fmt(k.cost-game.infinity)} IM`:''};});
 const upper=skillsViewModel(game).map(c=>{const k=c.skill,status=c.owned?'max':!c.available?'locked':infiniteAffordable(game,k.id)?'available':'poor';return {key:`infinite:${k.id}`,kind:'infinite',id:k.id,group:k.group,name:k.name,category:k.group==='rift'?'Rift育成':k.group==='combo'?'コンボ専用':'無限スキル',effect:k.scope,current:skillEffectText(k,c.level,game.state,fmt),next:c.owned?'':skillEffectText(k,c.next,game.state,fmt),levelLabel:`Lv.${c.level.toLocaleString('ja-JP')} / ${k.maxLevel??(k.special?1:'∞')} · 永続`,price:c.price?.amount??null,currency:'IM',status,expectedLevel:c.next,requirement:`前提：${k.requires?SKILLS.find(x=>x.id===k.requires).name:'なし'}${k.special?` · Ascension / Expansion 各Lv.${k.requiredSeriesLevel}`:''}${k.id==='feverEvolution'&&c.level===0&&feverProbabilities(game.state)[2]>2?' · Lv.1ではLegendary確率が2%になります':''}`,shortfall:status==='poor'?c.price?`あと ${fmt(c.price.amount.sub(H(game.infinity)))} IM`:'価格が数値表現の上限です':''};});
 return [...upper,...fixed];
}
export const availableSkills=(game,fmt=n=>String(n))=>skillCatalog(game,fmt).filter(i=>i.status==='available');
function structure(game){return [game.state.skills.join(','),Object.values(game.state.infiniteSkills).join(',')].join('|');}
export function mountSkillsView(root,game,fmt,filter='all'){
 const restore=retainShopPosition(root),items=skillCatalog(game,fmt);models.set(root,{game,filter,signature:structure(game)});
 root.innerHTML=`<div class="view-heading"><div><span class="eyebrow">PERMANENT EVOLUTION</span><h2>Infinity Skills</h2><p>IMで購入する永久強化。固定Skillと反復系列をすべて維持します。</p></div><div class="balance"><span data-skill-balance></span><small> IM</small></div></div>${availableMarkup('Skills')}<section class="all-catalog" aria-labelledby="all-skills-title"><div class="catalog-heading"><h3 id="all-skills-title">All Skills</h3></div><div class="filter-tabs" aria-label="Skillの種類">${Object.entries(title).map(([id,name])=>`<button class="filter-tab ${filter===id?'active':''}" data-filter="${id}" aria-pressed="${filter===id}">${name}</button>`).join('')}</div><p class="catalog-note">通常コンボ研究はDMで購入する周回限定強化。Infinity Skillは転生後も残ります。表示フィルターはAllだけに適用します。</p>${['rift','infinite','combo','fixed'].filter(id=>filter==='all'||filter===id).map(id=>`<section class="catalog-group" data-skill-group="${id}"><h3>${title[id]}</h3><div class="purchase-grid">${items.filter(i=>i.group===id).map(i=>shopCard(i,fmt)).join('')}</div></section>`).join('')}</section>`;
 updateSkillsView(root,game,fmt);restore();
}
export function updateSkillsView(root,game,fmt){
 const model=models.get(root);if(!model)return;if(model.game!==game||model.signature!==structure(game)){mountSkillsView(root,game,fmt,model.filter);return;}
 root.querySelector('[data-skill-balance]').textContent=fmt(game.infinity);
 const items=skillCatalog(game,fmt),byKey=new Map(items.map(i=>[i.key,i]));root.querySelectorAll('.all-catalog [data-item-key]').forEach(node=>syncShopCard(node,byKey.get(node.dataset.itemKey),fmt));
 updateAvailable(root.querySelector('.available-section'),items.filter(i=>i.status==='available'),fmt);
}
