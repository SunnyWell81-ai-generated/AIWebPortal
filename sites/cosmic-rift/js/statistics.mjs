import {rangeCount} from './research.mjs';
import {ACHIEVEMENTS} from './engine.mjs';

// Static layout, live values: updating numbers never replaces a focused summary
// or resets the player's disclosure choices.
const highlights=[
 ['lifetimeDM','累計獲得Dark Matter','DM · すべての周回','violet'],
 ['highestDps','最高DM/sec','DM · 自動生産の最高記録','cyan'],
 ['prestiges','転生回数','PRESTIGE · 宇宙の再生','red'],
 ['totalTime','累計プレイ時間','TOTAL PLAY TIME · 表示中のみ','']
];
export const STAT_GROUPS=[
 {id:'time',title:'プレイ時間・概要',description:'画面を表示している間の記録',open:true,rows:[
  ['runTime','この周回のプレイ時間（Current Run Time）'],['since','プレイ時間の計測開始']
 ]},
 {id:'dm',title:'Dark Matter',description:'DM · 通常施設を購入する物質',open:true,rows:[
  ['dm','現在の所持量'],['runDM','この周回の獲得量'],['dps','現在の自動生産 /sec'],
  ['clickDM','クリックから獲得'],['buildingDM','施設から獲得（表示中）'],['riftDM','Cosmic Riftから獲得'],['offlineDM','オフラインで獲得']
 ]},
 {id:'rm',title:'Red Matter',description:'RM · 永続施設を購入する物質',rows:[
  ['rm','現在の所持量'],['lifetimeRM','累計獲得量'],['rmps','現在の自動生産 /sec'],
  ['prestigeRM','転生から獲得'],['buildingRM','施設から獲得（表示中）'],['offlineRM','オフラインで獲得']
 ]},
 {id:'progress',title:'進行記録',description:'IM · Infinity Skillを取得するポイント',rows:[
  ['multiplier','現在の転生倍率'],['infinity','利用可能なInfinity Matter（IM）'],
  ['infinityEarned','累計獲得IM'],['infinitySpent','使用済みIM'],['skills','取得済み固定Skill'],['infiniteSeries','取得済み上位Skill系列'],['infiniteLevels','上位Skillの合計レベル'],
  ['upgrades','現在の通常研究'],['achievements','解除済み実績']
 ]},
 {id:'details',title:'その他の詳細統計',description:'クリック・施設・Cosmic Rift',rows:[
  ['clicks','累計クリック数'],['maxCombo','過去最高のコンボ'],['comboMax','現在のコンボ上限'],['comboStep','連続クリックごとの上昇量'],
  ['buildings','現在の通常施設'],['redBuildings','現在の永続施設'],['buildingsBought','累計施設購入数（通常＋永続）'],
  ['redBought','うち永続施設の購入数'],['upgradesBought','累計研究購入数（反復研究を含む）'],
  ['riftsAppeared','Cosmic Rift出現数'],['riftsClicked','Cosmic Rift捕捉数'],['offlineTime','オフライン生産の計算対象時間']
 ]}
];
export function statisticsMarkup(){
 return `<section class="statistics" aria-label="宇宙の統計">
  <div class="statistics-highlights">${highlights.map(([key,label,note,tone])=>`<article class="stat-highlight ${tone}"><h3>${label}</h3><strong data-stat="${key}">—</strong><p>${note}</p></article>`).join('')}</div>
  <p class="statistics-note">プレイ時間はゲーム画面の表示中のみ加算します。非表示・ブラウザ終了・スリープ中は含みません。旧セーブの過去の表示時間は復元せず、更新後の読み込みから計測します。生産と転生の待ち時間は従来どおりです。</p>
  <div class="statistics-groups">${STAT_GROUPS.map(group=>`<details class="stat-group" data-stat-group="${group.id}" ${group.open?'open':''}><summary><span><b>${group.title}</b><small>${group.description}</small></span><span class="stat-chevron" aria-hidden="true">⌄</span></summary><dl>${group.rows.map(([key,label])=>`<div class="stat-line"><dt>${label}</dt><dd data-stat="${key}">—</dd></div>`).join('')}</dl></details>`).join('')}</div>
 </section>`;
}
export function statisticsValues(game,fmt,duration){
 const s=game.state,t=s.stats,count=n=>n.toLocaleString('ja-JP'),percent=n=>String(Math.round(n*1000)/10),sum=a=>a.reduce((a,b)=>a+b,0);
 return {
  lifetimeDM:fmt(s.lifetimeDM),highestDps:fmt(t.highestDps),prestiges:`${count(s.prestiges)} 回`,totalTime:duration(s.activity.totalSeconds),
  runTime:duration(s.activity.runSeconds),since:new Date(s.activity.since).toLocaleString('ja-JP'),
  dm:fmt(s.dm),runDM:fmt(s.runDM),dps:fmt(game.dps),clickDM:fmt(t.clickDM),buildingDM:fmt(t.buildingDM),riftDM:fmt(t.riftDM),offlineDM:fmt(t.offlineDM),
  rm:fmt(s.rm),lifetimeRM:fmt(s.lifetimeRM),rmps:fmt(game.rmps),prestigeRM:fmt(t.prestigeRM),buildingRM:fmt(t.buildingRM),offlineRM:fmt(t.offlineRM),
  multiplier:`×${game.prestigeMultiplier().toFixed(3)}`,infinity:count(game.infinity),infinityEarned:count(s.infinityEarned),infinitySpent:count(s.infinitySpent),
  skills:count(s.skills.length),infiniteSeries:count(Object.values(s.infiniteSkills).filter(n=>n>0).length),infiniteLevels:count(Object.values(s.infiniteSkills).reduce((n,v)=>n+v,0)),upgrades:count(s.upgrades.length+s.facilityResearch.reduce((n,r)=>n+rangeCount(r),0)),achievements:`${count(s.achievements.length)} / ${ACHIEVEMENTS.length}`,
  clicks:count(t.clicks),maxCombo:`+${t.maxCombo}%`,comboMax:game.comboMax===null?'上限なし':`+${percent(game.comboMax)}%`,comboStep:`+${percent(game.comboStep)} ポイント`,
  buildings:count(sum(s.buildings)),redBuildings:count(sum(s.redBuildings)),buildingsBought:count(t.buildingsBought),redBought:count(t.redBought),upgradesBought:count(t.upgradesBought),
  riftsAppeared:count(t.riftsAppeared),riftsClicked:count(t.riftsClicked),offlineTime:duration(t.offlineSeconds)
 };
}
export function updateStatistics(root,game,fmt,duration){
 const values=statisticsValues(game,fmt,duration);
 root.querySelectorAll('[data-stat]').forEach(el=>{const value=values[el.dataset.stat];if(el.textContent!==value)el.textContent=value;});
}
