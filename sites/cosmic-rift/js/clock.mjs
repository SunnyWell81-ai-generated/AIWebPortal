import {CONFIG} from './config.mjs';

// A single wall-clock cursor owns production, saves and lifecycle transitions.
// Keep the cursor when a device clock moves backwards: that interval earns nothing.
export const MIN_TIMESTAMP=1577836800000;
export const MAX_TIMESTAMP=253402300799999;
export const validTimestamp=time=>Number.isSafeInteger(time)&&time>=MIN_TIMESTAMP&&time<=MAX_TIMESTAMP;

// Visible play time is independent of production, device time and offline rewards.
// A long gap means the loop was suspended (e.g. device sleep); do not guess activity.
export class VisiblePlayClock {
 constructor(state,now=performance.now()) {this.state=state;this.updatedAt=now;this.running=false;}
 advance(now=performance.now()) {
  if(!Number.isFinite(now)||now<=this.updatedAt)return 0;
  const seconds=(now-this.updatedAt)/1000;this.updatedAt=now;
  if(!this.running||seconds>30)return 0;
  this.state.activity.runSeconds+=seconds;this.state.activity.totalSeconds+=seconds;
  return seconds;
 }
 pause(now=performance.now()) {this.advance(now);this.running=false;}
 resume(now=performance.now()) {
  if(this.running){this.advance(now);return;}
  if(Number.isFinite(now))this.updatedAt=Math.max(this.updatedAt,now);
  this.running=true;
 }
}

export class ProductionClock {
 constructor(game,now=Date.now()) {
  if(!validTimestamp(now))throw new Error('保存日時が不正です。');
  this.game=game;this.updatedAt=now;this.suspended=false;this.absence=null;
 }
 advance(now=Date.now(),offline=false) {
  if(!validTimestamp(now)||now<=this.updatedAt)return null;
  const seconds=(now-this.updatedAt)/1000;this.updatedAt=now;
  if(!offline&&!this.suspended&&seconds<=CONFIG.offline.backgroundThresholdSeconds){this.game.tick(seconds);return null;}
  const remaining=this.suspended?Math.max(0,this.game.offlineHours*3600-(this.absence?.credited??0)):this.game.offlineHours*3600;
  const result=this.game.applyOffline(seconds,remaining);
  if(this.suspended&&result) {
   if(!this.absence)this.absence=result;
   else this.absence={...result,seconds:this.absence.seconds+result.seconds,credited:this.absence.credited+result.credited,dm:this.absence.dm.add(result.dm),rm:this.absence.rm.add(result.rm)};
   return null;
  }
  return result;
 }
 pause(now=Date.now()) {
  const result=this.advance(now);
  if(!this.suspended){this.suspended=true;this.absence=result;}
 }
 resume(now=Date.now()) {
  if(!this.suspended)return this.advance(now);
  this.advance(now);
  const result=this.absence;this.suspended=false;this.absence=null;
  return result;
 }
}
