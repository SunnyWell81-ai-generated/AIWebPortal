// Presentation only: no currency mutations or purchase rules live here.
export const statusText={available:'購入可能',poor:'通貨不足',locked:'未解放',owned:'購入済み',max:'MAX'};
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attribute={upgrade:'upgrade',repeat:'repeat',skill:'skill',infinite:'infinite-skill'};
function fields(item,fmt){return {name:item.name,category:item.category,effect:item.next===item.effect?'':item.effect,current:item.current,next:item.next,requirement:item.requirement,level:item.levelLabel,cost:`${item.price?fmt(item.price):'—'} ${item.currency}`,status:statusText[item.status],shortfall:item.shortfall};}
export function shopCard(item,fmt,area='all'){
 const f=fields(item,fmt),text=key=>escapeHtml(f[key]);
 return `<article class="purchase-card" data-shop-card="${area}:${item.key}" data-item-key="${item.key}" data-status="${item.status}"><header><small data-card-field="category">${text('category')}</small><span class="purchase-state" data-card-field="status">${text('status')}</span></header><h4 tabindex="-1" data-card-field="name">${text('name')}</h4><small class="purchase-level" data-card-field="level">${text('level')}</small><p ${f.effect?'':'hidden'} data-card-field="effect">${text('effect')}</p><dl class="purchase-effects"><div ${f.current?'':'hidden'}><dt>現在</dt><dd data-card-field="current">${text('current')}</dd></div><div ${f.next?'':'hidden'}><dt>購入後</dt><dd data-card-field="next">${text('next')}</dd></div></dl><small class="purchase-requirement" data-card-field="requirement">${text('requirement')}</small><div class="purchase-action"><strong data-card-field="cost">${text('cost')}</strong><button class="primary-button" data-${attribute[item.kind]}="${escapeHtml(item.id)}" ${item.kind==='infinite'?`data-infinite-level="${item.expectedLevel}"`:''} ${item.status==='available'?'':'disabled'} aria-label="${escapeHtml(item.name)}${item.status==='max'?' 最大レベル':item.status==='owned'?' 購入済み':item.kind==='infinite'?`をLv.${item.expectedLevel}へ強化`:'を購入'}">${item.status==='owned'?'取得済み':item.status==='max'?'MAX':item.kind==='infinite'?'強化する':'購入する'}</button></div><small class="research-shortfall" data-card-field="shortfall">${text('shortfall')}</small></article>`;
}
export function syncShopCard(node,item,fmt){
 const f=fields(item,fmt);if(node.dataset.status!==item.status)node.dataset.status=item.status;
 for(const [key,value]of Object.entries(f)){const el=node.querySelector(`[data-card-field="${key}"]`),text=value??'';if(el.textContent!==text)el.textContent=text;if(key==='current'||key==='next')el.parentElement.hidden=!text;if(key==='effect')el.hidden=!text;}
 const button=node.querySelector('button');button.disabled=item.status!=='available';
 const label=item.status==='owned'?'取得済み':item.status==='max'?'MAX':item.kind==='infinite'?'強化する':'購入する';if(button.textContent!==label)button.textContent=label;
 if(item.kind==='infinite')button.dataset.infiniteLevel=String(item.expectedLevel);
 button.setAttribute('aria-label',`${item.name}${item.status==='max'?' 最大レベル':item.status==='owned'?' 購入済み':item.kind==='infinite'?`をLv.${item.expectedLevel}へ強化`:'を購入'}`);
}
const availableStates=new WeakMap(),availableLimits=new Map();
export function availableMarkup(noun){return `<section data-available-type="${noun}" class="available-section" aria-labelledby="available-title"><div class="catalog-heading"><h3 id="available-title" tabindex="-1">Available ${noun}</h3><span data-available-count></span></div><p class="catalog-note">現在の通貨と解放条件で購入できる候補です。Allと同じ購入処理を使います。</p><div class="purchase-grid" data-available-grid></div><p class="catalog-empty" data-available-empty>現在購入できるものはありません。</p><button class="secondary-button available-more" data-available-more hidden>さらに表示</button></section>`;}
export function updateAvailable(section,items,fmt){
 let state=availableStates.get(section);
 if(!state){state={limit:availableLimits.get(section.dataset.availableType)??12,nodes:new Map()};availableStates.set(section,state);section.querySelector('[data-available-more]').addEventListener('click',()=>{state.limit+=12;availableLimits.set(section.dataset.availableType,state.limit);updateAvailable(section,state.items,state.fmt);});}
 state.items=items;state.fmt=fmt;const visible=items.slice(0,state.limit),keys=new Set(visible.map(i=>i.key)),grid=section.querySelector('[data-available-grid]');
 for(const [key,node]of state.nodes)if(!keys.has(key)){if(node.contains(document.activeElement))section.querySelector('h3').focus({preventScroll:true});node.remove();state.nodes.delete(key);}
 for(let i=0;i<visible.length;i++){const item=visible[i];let node=state.nodes.get(item.key);if(!node){const temp=document.createElement('div');temp.innerHTML=shopCard(item,fmt,'available');node=temp.firstElementChild;state.nodes.set(item.key,node);}syncShopCard(node,item,fmt);if(grid.children[i]!==node)grid.insertBefore(node,grid.children[i]??null);}
 const count=section.querySelector('[data-available-count]'),label=`${items.length}件${items.length>visible.length?` · ${visible.length}件表示`:''}`;if(count.textContent!==label)count.textContent=label;
 section.querySelector('[data-available-empty]').hidden=items.length>0;section.querySelector('[data-available-more]').hidden=visible.length>=items.length;
}
// Preserve focus and scroll across structural updates; currency-only updates keep nodes.
export function retainShopPosition(root){
 const active=root.contains(document.activeElement)?document.activeElement:null,card=active?.closest('[data-shop-card]'),key=card?.dataset.shopCard;
 const parent=root.closest('.shop'),top=parent?.scrollTop??0,y=window.scrollY;
 const selector=active?.dataset.filter?`[data-filter="${active.dataset.filter}"]`:active?.dataset.upgradeCategory?`[data-upgrade-category="${active.dataset.upgradeCategory}"]`:active?.matches('[data-research-filter]')?'[data-research-filter]':null;
 return ()=>{if(key){const match=[...root.querySelectorAll('[data-shop-card]')].find(n=>n.dataset.shopCard===key);const button=match?.querySelector('button');(button&&!button.disabled?button:match?.querySelector('h4')??root.querySelector('#available-title'))?.focus({preventScroll:true});}else if(selector)root.querySelector(selector)?.focus({preventScroll:true});if(parent)parent.scrollTop=top;if(window.scrollY!==y)window.scrollTo({top:y,behavior:'instant'});};
}
export function retainFacilityPosition(root){
 const list=root.querySelector('.building-list');if(!list)return ()=>{};
 const active=root.contains(document.activeElement)?document.activeElement:null,control=active?.dataset.amount!==undefined?`[data-amount="${active.dataset.amount}"]`:active?.dataset.currency?`[data-currency="${active.dataset.currency}"]`:null;
 const internal=list.scrollHeight>list.clientHeight+1&&getComputedStyle(list).overflowY!=='visible',top=list.scrollTop,y=window.scrollY,edge=internal?list.getBoundingClientRect().top:0;
 const anchor=[...list.querySelectorAll('[data-building]')].find(node=>node.getBoundingClientRect().bottom>edge),id=anchor?.dataset.building,offset=anchor?.getBoundingClientRect().top;
 const preserve=internal?top>0:y>list.getBoundingClientRect().top+y;
 return ()=>{const next=root.querySelector('.building-list'),card=id!==undefined?root.querySelector(`[data-building="${id}"]`):null;if(!next)return;if(control)root.querySelector(control)?.focus({preventScroll:true});if(internal){next.scrollTop=top;if(preserve&&card)next.scrollTop+=card.getBoundingClientRect().top-offset;}else if(preserve&&card)window.scrollTo({top:y+card.getBoundingClientRect().top-offset,behavior:'instant'});};
}
