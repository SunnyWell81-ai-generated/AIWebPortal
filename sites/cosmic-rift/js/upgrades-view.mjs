import {BUILDINGS,CLICK_UPGRADES,CONFIG,FACILITY_UPGRADES,RIFT_RESEARCH} from './config.mjs';
import {H} from './number.mjs';
import {researchChoices,nextResearch,researchHistory,rangeCount,endlessAffordable,rangeContains,legacyFacilityMultiplier} from './research.mjs';
import {shopCard,syncShopCard,availableMarkup,updateAvailable,retainShopPosition,escapeHtml} from './shop-ui.mjs';
const models=new WeakMap(),bound=new WeakSet();let facilityFilter='all',categoryFilter='all';
export const multiplierText=value=>Number(value.toFixed(7)).toLocaleString('en-US',{maximumFractionDigits:7});
export function groupAvailability(game,group){
 const ordinary=group.choices.some(u=>game.state.dm.gte(u.cost)),endless=endlessAffordable(game,group.building.id);
 return {priority:(ordinary?0:endless?50:group.owned?100:200)+group.building.id,label:ordinary?'購入可能':endless?'Endless可':group.choices.length?'DM待ち':'次を目指す'};
}
export function upgradeViewModel(game){return BUILDINGS.map(b=>{
 const s=game.state,owned=s.buildings[b.id]+s.redBuildings[b.id];
 return {building:b,owned,choices:researchChoices(game,b.id),next:nextResearch(b.id,owned),history:researchHistory(game,b.id),purchased:rangeCount(s.facilityResearch[b.id])+FACILITY_UPGRADES.filter(u=>u.building===b.id&&s.upgrades.includes(u.id)).length};
});}

export function upgradeItem(game,u){
 const s=game.state,owned=u.generated?rangeContains(s.facilityResearch[u.building],u.index):s.upgrades.includes(u.id),unlocked=game.upgradeAvailable(u),price=H(u.cost),building=u.building!==undefined?BUILDINGS[u.building]:null;
 const status=owned?'owned':!unlocked?'locked':s.dm.gte(price)?'available':'poor';
 const total=s.buildings.reduce((a,b)=>a+b,0)+s.redBuildings.reduce((a,b)=>a+b,0),factor=building?(u.generated?u.multiplier:legacyFacilityMultiplier(u.building,u.tier,s.buildings,total)):null;
 const effect=building?`通常DM生産 ×${multiplierText(factor)}${u.generated?'':` · ${u.description}`}`:u.description;
 const requirement=building?`必要 ${u.amount.toLocaleString('ja-JP')}基 / 現在 ${(s.buildings[u.building]+s.redBuildings[u.building]).toLocaleString('ja-JP')}基`:`${u.unlock?`解放：周回 ${u.unlock.toLocaleString('ja-JP')} DM · `:''}前提：${u.requires?game.getUpgrade(u.requires).name:'なし'}`;
 return {key:`upgrade:${u.id}`,kind:'upgrade',id:u.id,name:building?(u.generated?u.name:`${u.name} · ${u.amount.toLocaleString('ja-JP')}基`):u.name,category:building?building.name:RIFT_RESEARCH.some(r=>r.id===u.id)?'Cosmic Rift Research':'クリック・コンボ',effect,current:owned?'適用中':'未取得',next:owned?'':effect,price,currency:'DM',status,requirement,levelLabel:owned?'この周回で取得済み':'この周回のみ',shortfall:status==='poor'?'':status==='locked'?'解放条件・前提研究を満たすと購入できます':''};
}
export function endlessItem(game,id){
 const s=game.state,owned=s.buildings[id]+s.redBuildings[id],level=s.endless[id],price=game.repeatCost(id),max=level>=1e9,status=max?'max':owned<CONFIG.repeatUpgrade.requirement?'locked':endlessAffordable(game,id)?'available':'poor';
 return {key:`repeat:${id}`,kind:'repeat',id,name:`${BUILDINGS[id].name} · Endless Research`,category:BUILDINGS[id].name,effect:'節目研究と独立・通常DM施設のみを強化',current:`Lv.${level}`,next:max?'':`現在の生産から ×${CONFIG.repeatUpgrade.power}`,price,currency:'DM',status,requirement:`必要 ${CONFIG.repeatUpgrade.requirement}基 / 現在 ${owned.toLocaleString('ja-JP')}基`,levelLabel:`Lv.${level.toLocaleString('ja-JP')}`,shortfall:status==='locked'?`あと ${CONFIG.repeatUpgrade.requirement-owned}基`:''};
}
export function upgradeCatalog(game){
 const groups=upgradeViewModel(game);
 const sections=[{id:'click',name:'クリック・コンボ研究',items:CLICK_UPGRADES.map(u=>upgradeItem(game,u))},{id:'rift',name:'Cosmic Rift Research',items:RIFT_RESEARCH.map(u=>upgradeItem(game,u))}];
 for(const g of groups){const ids=new Set(),specs=[...FACILITY_UPGRADES.filter(u=>u.building===g.building.id),...g.choices,...g.history,...(g.next?[g.next]:[])].filter(u=>!ids.has(u.id)&&ids.add(u.id));sections.push({id:`facility-${g.building.id}`,name:g.building.name,group:g,items:[...specs.map(u=>upgradeItem(game,u)),endlessItem(game,g.building.id)]});}
 return sections;
}
export const availableUpgrades=game=>upgradeCatalog(game).flatMap(s=>s.items).filter(i=>i.status==='available');
function present(item,game,fmt){return {...item,current:item.kind==='repeat'?`Endless倍率 ×${fmt(H(CONFIG.repeatUpgrade.power).pow(game.state.endless[item.id]))}`:item.current,shortfall:item.status==='poor'?`あと ${fmt(item.price.sub(game.state.dm))} DM`:item.shortfall};}
function structure(game){const s=game.state;return [s.upgrades.join(','),game.researchRevision,s.endless.join(','),s.buildings.join(','),s.redBuildings.join(','),CLICK_UPGRADES.map(u=>game.upgradeAvailable(u)?1:0).join('')].join('|');}
export function mountUpgradeView(root,game,fmt){
 const restore=retainShopPosition(root),sections=upgradeCatalog(game),signature=structure(game);models.set(root,{game,signature,sections});
 root.innerHTML=`<div class="view-heading"><div><span class="eyebrow">EVOLVE YOUR UNIVERSE</span><h2>Upgrades</h2><p>DMで購入・転生でリセット。施設研究は通常＋永続の合計所有数で解放します。</p></div><div class="balance"><span data-upgrade-balance></span><small> DM</small></div></div>${availableMarkup('Upgrades')}<section class="all-catalog" aria-labelledby="all-upgrades-title"><div class="catalog-heading"><h3 id="all-upgrades-title">All Upgrades</h3></div><div class="filter-tabs" aria-label="Upgradeの種類">${[['all','すべて'],['click','クリック・コンボ'],['rift','Cosmic Rift'],['facility','施設研究']].map(([id,name])=>`<button class="filter-tab ${categoryFilter===id?'active':''}" data-upgrade-category="${id}" aria-pressed="${categoryFilter===id}">${name}</button>`).join('')}</div><label class="research-filter">施設を絞り込む<select data-research-filter aria-label="表示する施設"><option value="all">すべての施設</option>${BUILDINGS.map(b=>`<option value="${b.id}" ${facilityFilter===String(b.id)?'selected':''}>${b.name}</option>`).join('')}</select></label><p class="catalog-note">通常・Rift研究は全件表示。無限施設研究は各施設の未購入候補${CONFIG.facilityResearch.visibleLimit}件・購入済み上位${CONFIG.facilityResearch.historyLimit}件・次の解放を表示し、購入に応じて補充します。RM施設の自動強化はDMでの研究購入とは独立です。絞り込みはAllだけに適用します。</p>${sections.map(section=>`<section class="catalog-group" data-upgrade-section="${section.id}"><h3>${section.name}</h3>${section.group?`<p class="catalog-note" data-permanent-auto="${section.group.building.id}"></p>`:''}<div class="purchase-grid">${section.items.map(item=>shopCard(present(item,game,fmt),fmt)).join('')}</div></section>`).join('')}</section>`;
 if(!bound.has(root)){root.addEventListener('change',e=>{if(e.target.matches('[data-research-filter]')){facilityFilter=e.target.value;applyFilter(root);}});root.addEventListener('click',e=>{const button=e.target.closest('[data-upgrade-category]');if(button){categoryFilter=button.dataset.upgradeCategory;applyFilter(root);}});bound.add(root);}
 applyFilter(root);updateUpgradeView(root,game,fmt);restore();
}
function applyFilter(root){
 root.querySelectorAll('[data-upgrade-category]').forEach(b=>{b.classList.toggle('active',b.dataset.upgradeCategory===categoryFilter);b.setAttribute('aria-pressed',String(b.dataset.upgradeCategory===categoryFilter));});
 root.querySelectorAll('[data-upgrade-section]').forEach(section=>{const id=section.dataset.upgradeSection,isFacility=id.startsWith('facility-');section.hidden=categoryFilter!=='all'&&(categoryFilter==='facility'?!isFacility:categoryFilter!==id)||isFacility&&facilityFilter!=='all'&&id!==`facility-${facilityFilter}`;});
}
export function updateUpgradeView(root,game,fmt){
 const model=models.get(root);if(!model)return;if(model.game!==game||model.signature!==structure(game)){mountUpgradeView(root,game,fmt);return;}
 root.querySelector('[data-upgrade-balance]').textContent=fmt(game.state.dm);
 const sections=upgradeCatalog(game),items=sections.flatMap(s=>s.items),byKey=new Map(items.map(i=>[i.key,present(i,game,fmt)]));
 root.querySelectorAll('.all-catalog [data-item-key]').forEach(node=>{const item=byKey.get(node.dataset.itemKey);if(item)syncShopCard(node,item,fmt);});
 for(const b of BUILDINGS){const el=root.querySelector(`[data-permanent-auto="${b.id}"]`);el.textContent=`所有 ${(game.state.buildings[b.id]+game.state.redBuildings[b.id]).toLocaleString('ja-JP')}基 · RM自動強化 ×${fmt(game.facilityRates[b.id].automatic)}（DM・RMに適用）`;}
 updateAvailable(root.querySelector('.available-section'),items.filter(i=>i.status==='available').map(i=>present(i,game,fmt)),fmt);
}
// Legacy focus helper retained for callers; new cards use retainShopPosition.
export function restoreUpgradeFocus(root,id,group,disclosure){const next=(id?root.querySelector(`[data-upgrade="${id}"]`):null)??(group!==undefined?root.querySelector(`[data-research-group="${group}"] > summary`):null)??(disclosure?root.querySelector(`[data-disclosure="${disclosure}"] > summary`):null);next?.focus({preventScroll:true});}
