/** Nonnegative scientific numbers. About 15 significant digits, exponents up to 1e15.
 * No native Infinity/NaN is accepted or serialized. Arithmetic is immutable. */
export class Huge {
  constructor(m = 0, e = 0) {
    if (!Number.isFinite(m) || !Number.isFinite(e) || m < 0 || Math.abs(e) > 1e15) throw new RangeError('Invalid huge number');
    if (!m) { this.m = 0; this.e = 0; return; }
    const shift = Math.floor(Math.log10(m));
    this.m = shift < -308 ? Number(m.toExponential().split('e')[0]) : m / 10 ** shift;
    this.e = Math.trunc(e) + shift;
    if (this.m >= 10) { this.m /= 10; this.e++; }
    if (this.m < 1) { this.m *= 10; this.e--; }
    if (Math.abs(this.e) > 1e15) throw new RangeError('Exponent out of range');
  }
  static from(v) {
    if (v instanceof Huge) return v;
    if (typeof v === 'number') return new Huge(v);
    if (typeof v === 'string' && /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v)) {
      const [m, e = '0'] = v.toLowerCase().split('e'); return new Huge(Number(m), Number(e));
    }
    if (v && typeof v === 'object' && Object.keys(v).length === 2 && typeof v.m === 'number' && Number.isInteger(v.e)) return new Huge(v.m, v.e);
    throw new TypeError('Invalid number representation');
  }
  static pow10(n) { if (!Number.isFinite(n)) throw new RangeError('Invalid exponent'); const e = Math.floor(n); return new Huge(10 ** (n - e), e); }
  static max(a,b) { a=Huge.from(a); b=Huge.from(b); return a.gte(b)?a:b; }
  static min(a,b) { a=Huge.from(a); b=Huge.from(b); return a.lte(b)?a:b; }
  add(b) { b=Huge.from(b); if (!this.m) return b; if (!b.m) return this; const a=this.e>=b.e?this:b, c=this.e>=b.e?b:this; return a.e-c.e>16?a:new Huge(a.m+c.m*10**(c.e-a.e),a.e); }
  sub(b) { b=Huge.from(b); if (this.lte(b)) return new Huge(); if (!b.m || this.e-b.e>16) return this; return new Huge(Math.max(0,this.m-b.m*10**(b.e-this.e)),this.e); }
  mul(b) { b=Huge.from(b); return new Huge(this.m*b.m,this.e+b.e); }
  div(b) { b=Huge.from(b); if (!b.m) throw new RangeError('Division by zero'); return new Huge(this.m/b.m,this.e-b.e); }
  pow(n) { if (!Number.isFinite(n) || n<0) throw new RangeError('Invalid power'); if (!n) return new Huge(1); return this.m?Huge.pow10(this.log10()*n):new Huge(); }
  log10() { return this.m?Math.log10(this.m)+this.e:-1e15; }
  cmp(b) { b=Huge.from(b); if(!this.m||!b.m) return Math.sign(this.m-b.m); return this.e===b.e?Math.sign(this.m-b.m):Math.sign(this.e-b.e); }
  gte(b) { return this.cmp(b)>=0; } lte(b) { return this.cmp(b)<=0; } gt(b) { return this.cmp(b)>0; } lt(b) { return this.cmp(b)<0; } eq(b) { return this.cmp(b)===0; }
  floor() { if (this.e<0) return new Huge(); if (this.e>=15) return this; return new Huge(Math.floor(this.toNumber()+1e-10)); }
  toNumber() { if (this.e>308) return Number.MAX_VALUE; if(this.e < -323) return 0; return Math.min(Number.MAX_VALUE,this.m*10**this.e); }
  toJSON() { return {m:this.m,e:this.e}; }
}
export const H = v => Huge.from(v);
export function geometricCost(base, growth, owned, count=1) {
  if (!count) return H(0);
  const next=H(base).mul(H(growth).pow(owned));
  // The one-item price is also MAX's affordability boundary. Returning it directly
  // avoids cancellation in (growth - 1), which could disagree by a rounding bit.
  if (count===1) return next;
  return next.mul(H(growth).pow(count).sub(1)).div(growth-1);
}
export function maxAffordable(wallet, base, growth, owned, limit=9e12) {
  wallet=H(wallet); const next=H(base).mul(H(growth).pow(owned));
  if(wallet.lt?.(next) || !wallet.gte(next)) return 0;
  let n=Math.max(0,Math.min(limit-owned,Math.floor(wallet.mul(growth-1).div(next).add(1).log10()/Math.log10(growth)+1e-9)));
  if(n>0 && geometricCost(base,growth,owned,n).gt(wallet)) n--;
  if(n<limit-owned && geometricCost(base,growth,owned,n+1).lte(wallet)) n++;
  return n;
}
const suffix=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
export function format(v, notation='standard', digits=2) {
  const n=H(v); if(!n.m) return '0';
  if(n.e<3 && n.e>=-2) return n.toNumber().toLocaleString('en-US',{maximumFractionDigits:n.e<0?2:digits,minimumFractionDigits:0});
  if(n.e<0) return '<0.01';
  if(notation==='scientific' || n.e>=suffix.length*3) return `${n.m.toFixed(digits).replace(/\.?0+$/,'')}e${n.e.toLocaleString('en-US',{useGrouping:false})}`;
  const group=Math.floor(n.e/3); return `${(n.m*10**(n.e-group*3)).toFixed(digits).replace(/\.?0+$/,'')} ${suffix[group]}`;
}
