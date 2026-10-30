import {CONFIG,BUILDINGS} from './config.mjs';
import {H,Huge} from './number.mjs';

export const emptyRmUnlocks=()=>BUILDINGS.map(()=>false);
export function rmUnlockRequirement(id){return Huge.max(H(CONFIG.prestige.threshold),H(BUILDINGS[id].dm.cost).mul(CONFIG.prestige.rmUnlockCostFactor));}
// Huge is normalized: the exponent gives an exact decade boundary without log rounding.
export function prestigeLevelAt(produced){const n=H(produced);return n.lt(CONFIG.prestige.threshold)?0:n.e-H(CONFIG.prestige.threshold).e+1;}
export const prestigeLevelTarget=level=>Huge.pow10(H(CONFIG.prestige.threshold).e+level-1);
export const milestoneMultiplier=level=>Math.min(CONFIG.prestige.maxMultiplier,1+CONFIG.prestige.bonusPerLevelRoot*Math.sqrt(level));
// Frozen pre-v5 policy. Never use the current rebirth count to grow this migrated floor.
export const oldPrestigeMultiplier=count=>Math.min(3,1+0.1*Math.sqrt(count));
export function migratePrestigeState(raw){
 for(const key of ['rmUnlocked','prestigeMilestoneLevel','legacyPrestigeMultiplier'])if(Object.hasOwn(raw,key))throw Error('Unexpected prestige fields');
 return {...raw,version:5,rmUnlocked:BUILDINGS.map(b=>raw.redBuildings?.[b.id]>0||raw.stats?.highestRedBuildings?.[b.id]>0),prestigeMilestoneLevel:0,legacyPrestigeMultiplier:oldPrestigeMultiplier(raw.prestiges)};
}
