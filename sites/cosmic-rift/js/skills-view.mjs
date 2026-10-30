import {CONFIG,SKILLS,INFINITE_SKILLS} from './config.mjs';
import {H} from './number.mjs';
import {icon} from './icons.mjs';
import {infiniteSkillPrice,infiniteAvailable,infiniteAffordable} from './infinite-skills.mjs';
import {feverProbabilities,feverRanges,riftDurationMultiplier} from './rifts.mjs';
const title={all:'すべて',rift:'Rift育成',infinite:'無限スキル',combo:'コンボ専用',fixed:'既存の固定Skill'};
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
function fixedMarkup(game){return `<div class="skill-grid">${SKILLS.map(k=>{const owned=game.state.skills.includes(k.id),available=game.skillAvailable(k);return `<article class="skill-card ${owned?'owned':available?'':'locked'} ${k.category==='共鳴'?'resonance':''}"><div class="card-top"><span class="card-icon">${icon(k.category==='共鳴'?'prestige':'skills')}</span><div><h3>${k.name}</h3><small>${k.category}</small></div></div><p>${k.description}</p>${!owned&&!available?`<div class="lock-condition">累計IM ${k.earned}${k.requires?` · ${SKILLS.find(x=>x.id===k.requires).name}が必要`:''}</div>`:''}<div class="card-action"><span class="card-cost">${k.cost} IM</span>${owned?'<span class="card-status">取得済み</span>':`<button class="primary-button" data-skill="${k.id}" ${available&&game.infinity>=k.cost?'':'disabled'}>取得する</button>`}</div></article>`;}).join('')}</div>`;}
export function mountSkillsView(root,game,fmt,filter='all'){
 const focused=root.contains(document.activeElement)?document.activeElement?.dataset.infiniteSkill:null,fixedOpen=root.querySelector('.fixed-skills')?.open??false;
 const cards=skillsViewModel(game);
 const group=(id,heading)=>`<section class="infinite-skill-section"><h3>${heading}</h3><div class="skill-grid">${cards.filter(c=>c.skill.group===id).map(c=>{const k=c.skill,requires=SKILLS.find(x=>x.id===k.requires);return `<article class="skill-card infinite-skill-card ${c.owned?'owned':''}" data-series="${k.id}"><div class="card-top"><span class="card-icon">${icon(id==='combo'?'click':'infinity')}</span><div><h3 tabindex="-1">${k.name}</h3><small>${`Lv.${c.level.toLocaleString('ja-JP')} / ${k.maxLevel??(k.special?1:'∞')} · 永続`}</small></div></div><p>${k.scope}</p>${k.id==='feverEvolution'&&c.level===0&&feverProbabilities(game.state)[2]>2?'<p class="lock-condition">Lv.1ではLegendary確率が2%になります。現在のLuck研究の確率表を置き換えます。</p>':''}<dl class="skill-effects"><div><dt>現在</dt><dd>${skillEffectText(k,c.level,game.state,fmt)}</dd></div>${c.owned?'':`<div><dt>${k.special?'取得後':`次のLv.${c.next.toLocaleString('ja-JP')}`}</dt><dd>${skillEffectText(k,c.next,game.state,fmt)}</dd></div>`}</dl><p class="lock-condition">条件：${requires?.name??'IMで取得（追加の前提Skillなし）'}${k.special?` ＋ Ascension / Expansion 各Lv.${k.requiredSeriesLevel}`:''}</p><div class="card-action">${c.owned?`<span class="card-status">${k.special?'上限撤廃済み':'最大レベル'}</span><button class="primary-button" disabled aria-label="${k.name} 最大レベル">MAX</button>`:`<span class="card-cost">${c.price?fmt(c.price.amount):'—'} IM</span><button class="primary-button" data-infinite-skill="${k.id}" data-infinite-level="${c.next}" aria-label="${k.name}${k.special?'を取得':`をLv.${c.next}へ強化`}">${k.special?'取得する':'レベルアップ'}</button>`}</div><small class="research-shortfall" data-infinite-status="${k.id}"></small></article>`;}).join('')}</div></section>`;
 root.innerHTML=`<div class="view-heading"><div><span class="eyebrow">PERMANENT EVOLUTION</span><h2>Infinity Skills</h2><p>固定Skillを残したまま、IMで上位系列とRiftを育成。すべて転生後も維持します。</p></div><div class="balance"><span data-skill-balance></span><small> IM</small></div></div><div class="filter-tabs" aria-label="Skillの種類">${Object.entries(title).map(([id,name])=>`<button class="filter-tab ${filter===id?'active':''}" data-filter="${id}" aria-pressed="${filter===id}">${name}</button>`).join('')}</div>
 ${filter==='all'||filter==='infinite'?group('infinite','無限スキル · 恒久成長'):''}
 ${filter==='all'||filter==='rift'?group('rift','Cosmic Rift · 確率・時間・出現頻度'):''}
 ${filter==='all'||filter==='combo'?`<div class="combo-research-guide"><b>通常研究は周回限定、Infinity Skillは永久強化</b><p>DMで購入するOrbital Rhythm・Resonant Pulse・Singularity Cadenceは従来どおり残ります。基本性能 → 通常研究 → 固定Skill → 上位Skillの順に加算します。</p><small>通常研究の合計：上限 +45ポイント、増加量 +2ポイント。既存Rhythm Skillの合計：上限 +25ポイント、増加量 +1ポイント。</small></div>${group('combo','コンボ専用 · 上位強化')}`:''}
 ${filter==='all'||filter==='fixed'?`<details class="fixed-skills" ${filter==='fixed'||fixedOpen?'open':''}><summary>既存の固定Skill <span>${game.state.skills.length} / ${SKILLS.length} 取得</span></summary>${fixedMarkup(game)}</details>`:''}`;
 updateSkillsView(root,game,fmt);
 if(focused)(root.querySelector(`[data-infinite-skill="${focused}"]`)||root.querySelector(`[data-series="${focused}"] h3`))?.focus({preventScroll:true});
}
export function updateSkillsView(root,game,fmt){
 const balance=root.querySelector('[data-skill-balance]');if(balance)balance.textContent=fmt(game.infinity);
 root.querySelectorAll('[data-infinite-skill]').forEach(button=>{const id=button.dataset.infiniteSkill,price=infiniteSkillPrice(id,game.state.infiniteSkills[id]+1);button.disabled=!infiniteAffordable(game,id);root.querySelector(`[data-infinite-status="${id}"]`).textContent=!infiniteAvailable(game.state,id)?'前提条件を満たすと解放':!price?'次の価格を数値表現できません':price?.units===null||price?.units>game.infinity?`IM不足 · あと ${fmt(price.amount.sub(H(game.infinity)))} IM`:'購入可能';});
}
