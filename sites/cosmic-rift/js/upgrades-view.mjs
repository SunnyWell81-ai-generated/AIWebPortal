import {BUILDINGS,CLICK_UPGRADES,CONFIG,FACILITY_UPGRADES,RIFT_RESEARCH} from './config.mjs';
import {H} from './number.mjs';
import {icon} from './icons.mjs';
import {researchChoices,nextResearch,researchHistory,rangeCount,endlessAffordable} from './research.mjs';

const disclosure=new Map(),models=new WeakMap(),bound=new WeakSet();
let facilityFilter='all';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const multiplierText=value=>Number(value.toFixed(7)).toLocaleString('en-US',{maximumFractionDigits:7});
export function groupAvailability(game,group){
 const ordinary=group.choices.some(u=>game.state.dm.gte(u.cost)),endless=endlessAffordable(game,group.building.id);
 return {priority:(ordinary?0:endless?50:group.owned?100:200)+group.building.id,label:ordinary?'購入可能':endless?'Endless可':group.choices.length?'DM待ち':'次を目指す'};
}
export function upgradeViewModel(game){return BUILDINGS.map(b=>{
 const s=game.state,owned=s.buildings[b.id]+s.redBuildings[b.id];
 return {building:b,owned,choices:researchChoices(game,b.id),next:nextResearch(b.id,owned),history:researchHistory(game,b.id),purchased:rangeCount(s.facilityResearch[b.id])+FACILITY_UPGRADES.filter(u=>u.building===b.id&&s.upgrades.includes(u.id)).length};
});}
function row(u,fmt,mode='available'){
 const multiplier=u.multiplier??2,legacy=!u.generated,owned=mode==='owned',next=mode==='next';
 return `<article class="research-row ${next?'research-next':''}" ${next?'':`data-research-id="${u.id}"`}>
  <div class="research-row-top"><b>${u.amount.toLocaleString('ja-JP')}基研究</b><strong>×${multiplierText(multiplier)}</strong></div>
  <p>${legacy?u.description:`${u.major?'主要研究 · ':u.amount>1000?'中間研究 · ':''}通常DM施設の生産を強化`}${next?' · 次の解放':''}</p>
  <small data-research-requirement="${u.id}">必要 ${u.amount.toLocaleString('ja-JP')}基</small>
  <div class="research-row-action"><span>${fmt(u.cost)} <small>DM</small></span>${owned?'<b class="research-owned-label">取得済み</b>':next?'<span class="research-locked">未解放</span>':`<button class="primary-button" data-upgrade="${u.id}" aria-label="${escape(BUILDINGS[u.building].name)} ${u.amount}基研究を購入">研究する</button>`}</div>
  ${owned?'':`<small class="research-shortfall" data-shortfall="${u.id}"></small>`}
 </article>`;
}
export function mountUpgradeView(root,game,fmt){
 root.querySelectorAll('details[data-disclosure]').forEach(el=>disclosure.set(el.dataset.disclosure,el.open));
 const focused=root.contains(document.activeElement)?document.activeElement:null,focusId=focused?.dataset.upgrade,focusGroup=focused?.closest('[data-research-group]')?.dataset.researchGroup,focusDisclosure=focused?.closest('[data-disclosure]')?.dataset.disclosure;
 const priority=g=>groupAvailability(game,g).priority;
 const groups=upgradeViewModel(game).sort((a,b)=>priority(a)-priority(b));models.set(root,groups);
 const open=key=>disclosure.get(key)??(key==='facility-0');
 root.innerHTML=`<div class="view-heading"><div><span class="eyebrow">EVOLVE YOUR UNIVERSE</span><h2>Upgrades</h2><p>通常＋永続施設の所有数で解放。通常DM施設は購入して強化。RM施設は各研究の増加分を半分ずつ自動適用します。</p></div><div class="balance"><span data-upgrade-balance></span><small> DM</small></div></div>
 <p class="research-guide">100基までは従来の節目、150基からは50基ごと。1,000基以降も新しい研究が続きます。購入可能な施設を先に表示します。各施設の未購入候補は最大${CONFIG.facilityResearch.visibleLimit}件です。</p>
 <details class="research-clicks" data-disclosure="clicks" ${open('clicks')?'open':''}><summary>クリック・コンボ研究 <span>${game.state.upgrades.filter(id=>CLICK_UPGRADES.some(u=>u.id===id)).length} / ${CLICK_UPGRADES.length} 取得</span></summary><div class="upgrade-grid">${CLICK_UPGRADES.map(u=>`<article class="upgrade-card"><h3>${u.name}</h3><p>${u.description}</p><small>解放：周回 ${fmt(u.unlock)} DM${u.requires?` · ${CLICK_UPGRADES.find(x=>x.id===u.requires).name}`:''}</small><div class="card-action"><span class="card-cost">${fmt(u.cost)} DM</span>${game.state.upgrades.includes(u.id)?'<b class="research-owned-label">取得済み</b>':`<button class="primary-button" data-upgrade="${u.id}">研究する</button>`}</div><small class="research-shortfall" data-shortfall="${u.id}"></small></article>`).join('')}</div></details>
 <details class="research-clicks rift-research" data-disclosure="rifts" ${open('rifts')?'open':''}><summary>Cosmic Rift Research <span>${RIFT_RESEARCH.filter(u=>game.state.upgrades.includes(u.id)).length} / ${RIFT_RESEARCH.length} 取得</span></summary><p class="research-guide">DMで購入・転生でリセット。Fever Evolution Lv.1以上ではLuckの確率に優先します。Frequencyは次回の出現間隔抽選から、Durationは次に捕捉する効果から適用します。</p><div class="upgrade-grid">${RIFT_RESEARCH.map(u=>`<article class="upgrade-card"><h3>${u.name}</h3><p>${u.description}</p><small>前提：${u.requires?RIFT_RESEARCH.find(x=>x.id===u.requires).name:'なし'}</small><div class="card-action"><span class="card-cost">${fmt(u.cost)} DM</span>${game.state.upgrades.includes(u.id)?'<b class="research-owned-label">取得済み</b>':`<button class="primary-button" data-upgrade="${u.id}">研究する</button>`}</div><small class="research-shortfall" data-shortfall="${u.id}"></small></article>`).join('')}</div></details>
 <label class="research-filter">表示する施設<select data-research-filter aria-label="表示する施設"><option value="all">すべての施設</option>${BUILDINGS.map(b=>`<option value="${b.id}" ${facilityFilter===String(b.id)?'selected':''}>${b.name}</option>`).join('')}</select></label>
 <div class="research-groups ${facilityFilter==='all'?'':'is-filtered'}">${groups.map(g=>{
  const b=g.building,key=`facility-${b.id}`;
  return `<details class="research-group" data-disclosure="${key}" data-research-group="${b.id}" ${facilityFilter!=='all'&&facilityFilter!==String(b.id)?'hidden':''} ${open(key)?'open':''}><summary><span class="research-facility-icon">${icon(b.symbol,22)}</span><span><b>${b.name}</b><small>所有 ${g.owned.toLocaleString('ja-JP')}基 · 次の解放 ${g.next?`${g.next.amount.toLocaleString('ja-JP')}基`:'所有上限'}</small></span><span class="research-availability" data-availability="${b.id}"></span></summary>
   <div class="research-group-body"><p class="research-effect-note">通常 ${game.state.buildings[b.id].toLocaleString('ja-JP')}基 ＋ 永続 ${game.state.redBuildings[b.id].toLocaleString('ja-JP')}基 · ${g.purchased.toLocaleString('ja-JP')}件取得</p>
    <p class="research-auto-note" data-permanent-auto="${b.id}"></p>
    <div class="research-candidates">${g.choices.length?g.choices.map(u=>row(u,fmt)).join(''):'<p class="research-empty">現在解放済みの研究をすべて取得しています。</p>'}</div>
    ${g.next?row(g.next,fmt,'next'):'<p>施設所有数の上限に到達しました。</p>'}
    <details class="research-history" data-disclosure="history-${b.id}" ${open(`history-${b.id}`)?'open':''}><summary>取得済み ${g.purchased.toLocaleString('ja-JP')}件 <small>上位${CONFIG.facilityResearch.historyLimit}件まで表示</small></summary>${g.history.length?g.history.map(u=>row(u,fmt,'owned')).join(''):'<p class="research-empty">まだ購入していません。</p>'}</details>
    <section class="research-endless"><h3>Endless Research · Lv.${game.state.endless[b.id]}</h3><p>通常DM施設の生産 ×${CONFIG.repeatUpgrade.power} · 所有${CONFIG.repeatUpgrade.requirement}基で解放。節目の研究とは別に重なります。</p><div class="research-row-action"><span data-repeat-cost="${b.id}">${fmt(game.repeatCost(b.id))} DM</span><button class="secondary-button" data-repeat="${b.id}" aria-label="${b.name}のEndless Researchを購入">研究する</button></div><small class="research-shortfall" data-repeat-shortfall="${b.id}"></small></section>
   </div></details>`;
 }).join('')}</div>`;
 if(!bound.has(root)){
  root.addEventListener('toggle',event=>{if(event.target.matches('details[data-disclosure]'))disclosure.set(event.target.dataset.disclosure,event.target.open);},true);
  root.addEventListener('change',event=>{if(!event.target.matches('[data-research-filter]'))return;facilityFilter=event.target.value;root.querySelector('.research-groups').classList.toggle('is-filtered',facilityFilter!=='all');root.querySelectorAll('[data-research-group]').forEach(group=>{group.hidden=facilityFilter!=='all'&&group.dataset.researchGroup!==facilityFilter;if(facilityFilter===group.dataset.researchGroup)group.open=true;});});
  bound.add(root);
 }
 updateUpgradeView(root,game,fmt);
 if(focused)restoreUpgradeFocus(root,focusId,focusGroup,focusDisclosure);
}
export function updateUpgradeView(root,game,fmt){
 const groups=models.get(root);if(!groups)return;
 root.querySelector('[data-upgrade-balance]').textContent=fmt(game.state.dm);
 root.querySelectorAll('[data-upgrade]').forEach(button=>{const u=game.getUpgrade(button.dataset.upgrade);button.disabled=!game.upgradeAvailable(u)||!game.state.dm.gte(u.cost);});
 root.querySelectorAll('[data-shortfall]').forEach(el=>{const u=game.getUpgrade(el.dataset.shortfall),missing=H(u.cost).sub(game.state.dm);el.textContent=RIFT_RESEARCH.some(r=>r.id===u.id)&&u.requires&&!game.state.upgrades.includes(u.requires)?`先に ${game.getUpgrade(u.requires).name} を研究`:missing.gt(0)?`あと ${fmt(missing)} DM`:'DM充足';});
 for(const g of groups){
  const id=g.building.id,element=root.querySelector(`[data-research-group="${id}"]`),availability=groupAvailability(game,g);
  element.querySelector('[data-permanent-auto]').textContent=`RM施設：自動強化 ×${fmt(game.facilityRates[id].automatic)} 適用中 · DM・RMの両方（DM研究購入とは独立）`;
  element.style.order=String(availability.priority);root.querySelector(`[data-availability="${id}"]`).textContent=availability.label;
  for(const u of [...g.choices,...g.history,...(g.next?[g.next]:[])]){const el=element.querySelector(`[data-research-requirement="${u.id}"]`);if(el)el.textContent=`必要 ${u.amount.toLocaleString('ja-JP')}基 / 現在 ${g.owned.toLocaleString('ja-JP')}基`;}
  const cost=game.repeatCost(id),button=root.querySelector(`[data-repeat="${id}"]`);button.disabled=!endlessAffordable(game,id);
  root.querySelector(`[data-repeat-shortfall="${id}"]`).textContent=g.owned<CONFIG.repeatUpgrade.requirement?`あと ${CONFIG.repeatUpgrade.requirement-g.owned}基で解放`:game.state.dm.lt(cost)?`あと ${fmt(cost.sub(game.state.dm))} DM`:'DM充足';
 }
}

// Purchased buttons disappear. Restore to their disclosure instead of calling focus on false.
export function restoreUpgradeFocus(root,id,group,disclosure){
 const next=(id?root.querySelector(`[data-upgrade="${id}"]`):null)??(group!==undefined?root.querySelector(`[data-research-group="${group}"] > summary`):null)??(disclosure?root.querySelector(`[data-disclosure="${disclosure}"] > summary`):null);
 next?.focus({preventScroll:true});
}
