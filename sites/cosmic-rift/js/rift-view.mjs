import {FEVER_PRIORITY,activeRift,feverColor,riftEffectText} from './rifts.mjs';

// One node per active effect; countdowns never replace the entire list.
export class RiftView {
 constructor(host,frame){this.host=host;this.frame=frame;this.nodes=new Map();host.setAttribute('role','list');}
 update(state){
  for(const [id,node] of this.nodes)if(!activeRift(state,id)){node.remove();this.nodes.delete(id);}
  for(const id of FEVER_PRIORITY){
   const effect=activeRift(state,id);if(!effect)continue;
   let node=this.nodes.get(id);
   if(!node){node=document.createElement('span');node.className='effect-chip';node.dataset.effect=id;node.setAttribute('role','listitem');node.append(document.createElement('span'),document.createElement('b'));this.nodes.set(id,node);this.host.append(node);}
   node.dataset.tier=effect.tier??'';
   const label=riftEffectText(effect),time=`${Math.ceil(effect.remaining)}秒`;
   if(node.firstElementChild.textContent!==label)node.firstElementChild.textContent=label;
   if(node.lastElementChild.textContent!==time)node.lastElementChild.textContent=time;
  }
  const tier=activeRift(state,'frenzy')?.tier??'';if(this.frame.dataset.feverTier!==tier)this.frame.dataset.feverTier=tier;
  const color=feverColor(state);if(this.frame.dataset.fever!==color)this.frame.dataset.fever=color;
 }
}
