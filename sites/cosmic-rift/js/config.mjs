/** All tunable game balance lives here. No backend or runtime dependency. */
export const CONFIG={
  version:9, productionScale:1, dmGrowth:1.15, rmGrowth:1.2, maxBuildingCount:9e12,
  baseClick:1, comboWindow:1.5, comboMax:0.15, comboStep:0.01,comboSoftStart:10,
  prestige:{threshold:1e6,base:10,power:0.4,minRunSeconds:180,rmUnlockCostFactor:50,runRmRewardShare:0.25,bonusPerLevelRoot:0.15,maxMultiplier:4},
  permanentDmMultiplier:3, permanentRmMultiplier:0.5,
  infinity:{first:1e5,growth:6},
  // minimumSeconds controls the return dialog only; every positive absence produces Matter.
  offline:{hours:8,efficiency:1,minimumSeconds:60,backgroundThresholdSeconds:30},
  rift:{minimumInterval:10,minInterval:90,maxInterval:180,visibleSeconds:13,minimumBurstDps:1,effects:[
    {id:'surge',name:'Cosmic Fever',label:'施設DM生産 ×7',weight:25,seconds:30,production:7},
    {id:'cache',name:'Matter Burst',label:'恒常DM生産10分相当',weight:25,cacheSeconds:600},
    {id:'frenzy',name:'Click Frenzy',label:'クリック ×7',weight:20,seconds:20,click:7},
    {id:'facility',name:'Facility Frenzy',label:'対象施設DM生産 ×15',weight:20,seconds:30,facilityProduction:15},
    {id:'market',name:'Market Collapse',label:'通常施設 30%OFF',weight:10,seconds:30,price:0.7}
  ]},
  autosaveSeconds:30, uiInterval:200, maxPopups:14,
  upgradeMilestones:[10,25,50,100,200],upgradeCostFactors:[8,60,400,4000,60000],
  repeatUpgrade:{requirement:200,costFactor:150000,growth:12,power:1.5},
  facilityResearch:{priceK:16,visibleLimit:6,historyLimit:6},
};
// Save arrays are indexed by these stable IDs. Append new entries; never reorder IDs.
// DM and RM definitions are separate so later phases can evolve them independently.
export const LEGACY_BUILDING_COUNT=13;
export const BUILDINGS=[
 {id:0,name:"Matter Collector",dm:{cost:15,rate:0.1},rm:{cost:1,resonanceSkillId:'resonance0'},symbol:'collector',description:'宇宙の微かな揺らぎを、最初の一粒へ。'},
 {id:1,name:"Quantum Extractor",dm:{cost:100,rate:1},rm:{cost:25,resonanceSkillId:'resonance1'},symbol:'quantum',description:'量子の海から、未知の物質を抽出。'},
 {id:2,name:"Dark Reactor",dm:{cost:1100,rate:8},rm:{cost:400,resonanceSkillId:'resonance2'},symbol:'reactor',description:'暗黒エネルギーを安定した力に変える。'},
 {id:3,name:"Orbital Harvester",dm:{cost:12000,rate:47},rm:{cost:6000,resonanceSkillId:'resonance3'},symbol:'orbital',description:'惑星軌道を巡る巨大な採取ネットワーク。'},
 {id:4,name:"Stellar Forge",dm:{cost:130000,rate:260},rm:{cost:90000,resonanceSkillId:'resonance4'},symbol:'stellar',description:'恒星の心臓を、物質の鍛造炉に。'},
 {id:5,name:"Void Generator",dm:{cost:1400000,rate:1400},rm:{cost:1400000,resonanceSkillId:'resonance5'},symbol:'void',description:'何もない空間から、無尽蔵の可能性を。'},
 {id:6,name:"Singularity Core",dm:{cost:20000000,rate:7800},rm:{cost:25000000,resonanceSkillId:'resonance6'},symbol:'core',description:'無限の密度をひとつの核に閉じ込める。'},
 {id:7,name:"Black Hole Engine",dm:{cost:330000000,rate:44000},rm:{cost:500000000,resonanceSkillId:'resonance7'},symbol:'blackhole',description:'事象の地平線を越え、力を取り出す。'},
 {id:8,name:"Galactic Foundry",dm:{cost:5100000000,rate:260000},rm:{cost:10000000000,resonanceSkillId:'resonance8'},symbol:'galaxy',description:'銀河そのものを動かす生産施設。'},
 {id:9,name:"Cosmic Fabricator",dm:{cost:75000000000,rate:1600000},rm:{cost:250000000000,resonanceSkillId:'resonance9'},symbol:'cosmic',description:'宇宙の構造を編み直し、物質を紡ぐ。'},
 {id:10,name:"Reality Converter",dm:{cost:1000000000000,rate:10000000},rm:{cost:7000000000000,resonanceSkillId:'resonance10'},symbol:'reality',description:'現実の法則を、新しい資源へ変換。'},
 {id:11,name:"Dimension Reactor",dm:{cost:14000000000000,rate:65000000},rm:{cost:220000000000000,resonanceSkillId:'resonance11'},symbol:'dimension',description:'並行次元から流れ込む終わりなき力。'},
 {id:12,name:"Eternity Engine",dm:{cost:170000000000000,rate:430000000},rm:{cost:8000000000000000,resonanceSkillId:'resonance12'},symbol:'eternity',description:'時間の外側で、永遠を生産する。'},
 {id:13,name:"Prismatic Nexus",dm:{cost:2100000000000000.0,rate:2900000000.0},rm:{cost:1.2e+17,resonanceSkillId:null},symbol:'prismatic',description:'光の分岐を束ね、物質の流れを結ぶ。'},
 {id:14,name:"Probability Matrix",dm:{cost:2.6e+16,rate:21000000000.0},rm:{cost:1.8e+18,resonanceSkillId:null},symbol:'probability',description:'無数の可能性から、確かな物質を選び出す。'},
 {id:15,name:"Fractal Singularity",dm:{cost:3.1e+17,rate:150000000000.0},rm:{cost:2.7e+19,resonanceSkillId:null},symbol:'fractal',description:'入れ子の特異点から、尽きない構造を取り出す。'},
 {id:16,name:"Quantum Mainframe",dm:{cost:7.1e+19,rate:1100000000000.0},rm:{cost:4.5e+20,resonanceSkillId:null},symbol:'mainframe',description:'量子計算の網目で、宇宙の物質を編み上げる。'},
 {id:17,name:"Multiverse Harvester",dm:{cost:1.2e+22,rate:8300000000000.0},rm:{cost:7.5e+21,resonanceSkillId:null},symbol:'multiverse',description:'多元宇宙を巡り、次元を超えて物質を集める。'},
 {id:18,name:"Cosmic Consciousness",dm:{cost:1.9e+24,rate:64000000000000.0},rm:{cost:1.2e+23,resonanceSkillId:null},symbol:'consciousness',description:'宇宙の意識が、思考を新たな物質へ変える。'},
 {id:19,name:"Omniversal Architect",dm:{cost:5.4e+26,rate:510000000000000.0},rm:{cost:2e+24,resonanceSkillId:null},symbol:'architect',description:'すべての宇宙を設計し、存在の基盤を築く。'},
].map(building=>({
 ...building,
 // Existing consumers keep these aliases; the nested definitions are the source of truth.
 get cost(){return this.dm.cost;},get rate(){return this.dm.rate;},get redCost(){return this.rm.cost;}
}));
export const BUILDING_COUNT=BUILDINGS.length;
export const emptyBuildingCounts=()=>BUILDINGS.map(()=>0);
export const CLICK_UPGRADES=[
  {id:'click1',name:'Event Horizon',description:'クリックの力 ×2',cost:75,unlock:30,mult:2},
  {id:'click2',name:'Gravitational Pull',description:'クリックの力 ×2',cost:600,unlock:500,mult:2,requires:'click1'},
  {id:'click3',name:'Tidal Compression',description:'クリックの力 ×4',cost:8000,unlock:5000,mult:4,requires:'click2'},
  {id:'click4',name:'Matter Coupling',description:'恒常DM/secの1%をクリックに追加',cost:30000,unlock:20000,dps:.01,requires:'click3'},
  {id:'click5',name:'Singularity Touch',description:'恒常DM/secの4%をクリックに追加',cost:700000,unlock:400000,dps:.04,requires:'click4'},
  {id:'click6',name:'Rift Attunement',description:'Click Frenzy中のクリック ×3',cost:15000000,unlock:10000000,rift:3,requires:'click5'},
  {id:'click7',name:'Cosmic Feedback',description:'恒常DM/secの5%をクリックに追加',cost:500000000,unlock:100000000,dps:.05,requires:'click6'},
  {id:'combo1',name:'Orbital Rhythm',description:'コンボ上限 +15ポイント・1クリックごとの上昇量 +0.5ポイント',cost:2500,unlock:1000,requires:'click2',comboMax:.15,comboStep:.005},
  {id:'combo2',name:'Resonant Pulse',description:'コンボ上限 +15ポイント・1クリックごとの上昇量 +0.5ポイント',cost:100000,unlock:50000,requires:'combo1',comboMax:.15,comboStep:.005},
  {id:'combo3',name:'Singularity Cadence',description:'コンボ上限 +15ポイント・1クリックごとの上昇量 +1ポイント',cost:5000000,unlock:2000000,requires:'combo2',comboMax:.15,comboStep:.01},
];
const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];
export const SKILLS=[
  {id:'touch1',name:'Quantum Touch',category:'探索',description:'クリックの力 +25%',cost:1,earned:1,effect:'click',value:1.25},
  {id:'flow1',name:'Dark Flow',category:'探索',description:'全施設のDM・RM生産 +10%',cost:1,earned:1,effect:'production',value:1.1},
  {id:'touch2',name:'Gravity Well',category:'探索',description:'クリックの力 +50%',cost:2,earned:3,requires:'touch1',effect:'click',value:1.5},
  {id:'flow2',name:'Cosmic Expansion',category:'探索',description:'全施設のDM・RM生産 +25%',cost:2,earned:3,requires:'flow1',effect:'production',value:1.25},
  {id:'rift1',name:'Rift Sensing',category:'裂け目',description:'Cosmic Riftの出現間隔 −10%',cost:1,earned:2,effect:'riftFrequency',value:.9},
  {id:'rift2',name:'Temporal Anchor',category:'裂け目',description:'Riftの表示時間 +20%',cost:2,earned:4,requires:'rift1',effect:'riftDuration',value:1.2},
  {id:'rift3',name:'Event Echo',category:'裂け目',description:'Rift効果の持続時間 +25%',cost:3,earned:7,requires:'rift2',effect:'effectDuration',value:1.25},
  {id:'rift4',name:'Cosmic Fortune',category:'裂け目',description:'Matter Burstの獲得量 ×2',cost:3,earned:10,requires:'rift3',effect:'cache',value:2},
  {id:'prestige1',name:'Crimson Memory',category:'永続',description:'PrestigeのRed Matter +10%',cost:2,earned:4,effect:'prestige',value:1.1},
  {id:'prestige2',name:'Scarlet Legacy',category:'永続',description:'PrestigeのRed Matter +25%',cost:3,earned:8,requires:'prestige1',effect:'prestige',value:1.25},
  {id:'offline1',name:'Silent Observer',category:'時間',description:'オフライン生産効率 +10ポイント',cost:1,earned:2,effect:'offline',value:.1},
  {id:'offline2',name:'Deep Sleep',category:'時間',description:'オフライン上限 +2時間',cost:2,earned:4,requires:'offline1',effect:'offlineHours',value:2},
  {id:'offline3',name:'Timeless Watch',category:'時間',description:'オフライン生産効率 +15ポイント',cost:3,earned:8,requires:'offline2',effect:'offline',value:.15},
  {id:'offline4',name:'Eternal Watch',category:'時間',description:'オフライン上限 +6時間',cost:4,earned:13,requires:'offline3',effect:'offlineHours',value:6},
  {id:'red1',name:'Permanent Imprint',category:'永続',description:'永続施設のDM・RM生産 +25%',cost:2,earned:5,effect:'red',value:1.25},
  {id:'red2',name:'Crimson Convergence',category:'永続',description:'永続施設のDM・RM生産 +50%',cost:4,earned:12,requires:'red1',effect:'red',value:1.5},
  {id:'flow3',name:'Universal Constant',category:'探索',description:'全施設のDM・RM生産 +50%',cost:4,earned:12,requires:'flow2',effect:'production',value:1.5},
  {id:'touch3',name:'Infinite Touch',category:'探索',description:'恒常DM/secの2%をクリックに追加',cost:3,earned:9,requires:'touch2',effect:'clickDps',value:.02},
  {id:'rhythm1',name:'Enduring Rhythm',category:'探索',description:'コンボ上限 +10ポイント・1クリックごとの上昇量 +0.5ポイント（永続）',cost:1,earned:3,requires:'touch1',comboMax:.1,comboStep:.005},
  {id:'rhythm2',name:'Eternal Cadence',category:'探索',description:'コンボ上限 +15ポイント・1クリックごとの上昇量 +0.5ポイント（永続）',cost:3,earned:9,requires:'rhythm1',comboMax:.15,comboStep:.005},
  ...BUILDINGS.slice(0,9).map((b,i)=>({id:`special${i}`,name:`${b.name.split(' ')[0]} Mastery`,category:'施設',description:`${b.name}のDM・RM生産 +50%`,cost:2+Math.floor(i/3),earned:4+i*3,effect:`building${i}`,value:1.5})),
  ...BUILDINGS.filter(b=>b.rm.resonanceSkillId!==null).map((b,i)=>({id:b.rm.resonanceSkillId,name:`Red Resonance ${roman[i]}`,category:'共鳴',description:`永続${b.name}のRM生産 ×1.5（DM生産には適用しない）。RM生産は未取得でも有効`,cost:4+i,earned:10+i*5,requires:i?`resonance${i-1}`:'red1',effect:`resonance${i}`,value:1.5}))
];
export const FACILITY_UPGRADES=BUILDINGS.flatMap((b,i)=>CONFIG.upgradeMilestones.map((amount,t)=>({id:`b${i}u${t}`,building:i,tier:t,amount,cost:b.cost*CONFIG.upgradeCostFactors[t],name:[`${b.name.split(' ')[0]} Calibration`,'Quantum Synchrony','Gravity Cascade','Stellar Network','Infinite Architecture'][t],description:t===2?'生産 ×2 ＋ 上位施設1個につき +1%':t===4?'生産 ×2 ＋ 全施設25個につき +1%':'施設生産 ×2'})));
export const RIFT_RESEARCH=[
 {id:'rift_frequency_1',name:'Rift Frequency I',cost:100000,description:'Rift出現間隔 ×0.9（Sensing・Accelerationと乗算）',interval:.9},
 {id:'rift_frequency_2',name:'Rift Frequency II',cost:10000000,requires:'rift_frequency_1',description:'Rift出現間隔 さらに×0.9',interval:.9},
 {id:'rift_duration_1',name:'Rift Duration I',cost:250000,description:'時間制Riftの持続時間 ×1.1（Echo・Masteryと乗算）',duration:1.1},
 {id:'rift_duration_2',name:'Rift Duration II',cost:25000000,requires:'rift_duration_1',description:'時間制Riftの持続時間 さらに×1.1',duration:1.1},
 {id:'rift_fortune',name:'Rift Fortune',cost:5000000,description:'Matter Burst獲得量 ×2（Cosmic Fortuneと乗算）',fortune:2},
 {id:'rift_luck_1',name:'Rift Luck I',cost:1000000,description:'Fever確率 88% / 10% / 2%（Evolution Lv.0時）',luck:1},
 {id:'rift_luck_2',name:'Rift Luck II',cost:100000000,requires:'rift_luck_1',description:'Fever確率 85% / 12% / 3%（Evolution Lv.0時）',luck:2},
 {id:'rift_luck_3',name:'Rift Luck III',cost:10000000000,requires:'rift_luck_2',description:'Fever確率 80% / 15% / 5%（Evolution Lv.0時）',luck:3},
].map(u=>({...u,unlock:0}));
export const FEVER_TIERS=[
 {id:'normal',name:'NORMAL FEVER',click:7,min:20,max:30,expandedMax:40,stableMin:30},
 {id:'rare',name:'RARE FEVER',click:77,min:10,max:20,expandedMax:25,stableMin:15},
 {id:'legendary',name:'LEGENDARY FEVER',click:777,min:1,max:7,expandedMax:9,stableMin:4},
];
export const FEVER_LUCK=[[90,9,1],[88,10,2],[85,12,3],[80,15,5]];
export const FEVER_EVOLUTION=[[90,9,1],[80,18,2],[65,32,3],[50,45,5],[30,63,7],[10,82,8],[0,91,9],[0,75,25],[0,50,50],[0,25,75],[0,0,100]];
export const UPGRADES=[...CLICK_UPGRADES,...FACILITY_UPGRADES,...RIFT_RESEARCH];
// Fixed SKILLS above retain their IDs, costs and effects. These are independent upper tiers.
export const INFINITE_SKILLS=[
 {id:'cosmicFlow',name:'Cosmic Flow',group:'infinite',requires:'flow3',baseCost:2,growth:1.10,power:1.04,scope:'通常・永続施設のDMのみ'},
 {id:'eternalTouch',name:'Eternal Touch',group:'infinite',requires:'touch3',baseCost:2,growth:1.10,power:1.05,scope:'クリック全体（コンボとは別枠）'},
 {id:'redAmplification',name:'Red Amplification',group:'infinite',requires:'red2',baseCost:2,growth:1.12,power:1.03,scope:'永続施設のRMのみ・Resonanceと乗算'},
 {id:'prestigeLegacy',name:'Prestige Legacy',group:'infinite',requires:'prestige2',baseCost:3,growth:1.12,power:1.06,scope:'転生RM報酬のみ・到達段階とは独立'},
 {id:'riftMastery',name:'Rift Mastery',group:'infinite',requires:'rift3',baseCost:2,growth:1.10,durationPerLevel:.02,scope:'新しく捕捉した時間制Riftの持続時間'},
 {id:'comboAscension',name:'Combo Ascension',group:'combo',requires:'rhythm2',baseCost:1,growth:1.08,stepPerLevel:.005,scope:'1レベルごとにコンボ増加量 +0.5ポイント'},
 {id:'comboExpansion',name:'Combo Expansion',group:'combo',requires:'rhythm2',baseCost:1,growth:1.08,capPerLevel:.20,unboundedStepPerLevel:.0005,scope:'上限 +20ポイント/Lv・上限解除後は増加量 +0.05ポイント/Lv'},
 {id:'comboSingularity',name:'Combo Singularity',group:'combo',requires:'rhythm2',baseCost:30,growth:1,special:true,requiredSeriesLevel:20,scope:'Ascension・Expansion各Lv.20で解放。継続クリックの上限を撤廃'},
 {id:'feverEvolution',name:'Fever Evolution',group:'rift',baseCost:5,priceStep:3,maxLevel:10,scope:'Click Frenzy当選後のFever確率を進化。Lv.1以上ではRift Luckに優先'},
 {id:'temporalExpansion',name:'Temporal Expansion',group:'rift',baseCost:12,growth:1,maxLevel:1,scope:'Feverの基本持続時間の上限を拡張。Duration・Echo・Masteryはその後に乗算'},
 {id:'temporalStabilization',name:'Temporal Stabilization',group:'rift',baseCost:12,growth:1,maxLevel:1,scope:'Feverの基本持続時間の下限を安定化。Expansionと併用可能'},
 {id:'riftAcceleration',name:'Rift Acceleration',group:'rift',baseCost:3,growth:1.35,scope:'Rift出現間隔 ×0.95/Lv。研究・Sensingと乗算、最終間隔は最低10秒'},
];
// Historical combo records survive the loss of run upgrades at Prestige.
export const MAX_COMBO_PERCENT=Math.round((CONFIG.comboMax+[...CLICK_UPGRADES,...SKILLS].reduce((sum,item)=>sum+(item.comboMax||0),0))*100);
