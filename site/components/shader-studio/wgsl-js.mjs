// WGSL サブセット → JavaScript トランスパイラ (CPU プレビュー用)。
//
// 対象はパックが書ける WGSL の実用サブセット (docs: api/restrictions.md):
//   fn / struct / const / alias / var<private>、let・var、if/else・for・while・
//   loop・switch、return/discard/break/continue、配列・行列・構造体、
//   WGSL 組み込み関数 (sin/mix/clamp/select 等)。
//   ※ ポインタ (ptr<...>, &x, *p) は明確なエラーにする (GPU パスのみ対応)。
//   ※ 導関数 (dpdx/dpdy/fwidth) は 0 近似 (uses.derivatives で通知)。
//
// 値モデル:
//   vec2/3/4 → JS 配列 [x,y,(z),(w)]  (vec2i/u も同じ。数値は JS number)
//   mat2/2/3/4 (正方) → Float32Array(n*n) 列優先 (renderer.mjs と同一レイアウト)
//   struct → プレーンオブジェクト {フィールド: 値}
//   構造体コンストラクタは配列型フィールドを「コピー」する (WGSL の値意味論に
//   合わせ、out.colour *= v が入力 s.colour を破壊しないようにするため)。
//
// 生成コードは new Function('$__env', src) で評価し、モジュールスコープの
// 関数・定数をまとめたオブジェクトを返す。$__env 経由で bloxdPackInputs・
// bloxdTexel などの外部シンボルを注入する。

// ---------------------------------------------------------------- helpers --

// 生成コードに先頭へ埋め込むランタイムヘルパー群。
const HELPERS_SRC = String.raw`
var _FLD = ['x','y','z','w'];
function _fl(a){var o=[],i,x;for(i=0;i<a.length;i++){x=a[i];if(typeof x==='number'||typeof x==='boolean')o.push(x);else if(Array.isArray(x)){for(var j=0;j<x.length;j++)o.push(x[j]);}else if(x&&typeof x==='object'&&'x' in x){o.push(x.x,x.y!==undefined?x.y:0,x.z!==undefined?x.z:0,x.w!==undefined?x.w:0);}else o.push(x);}return o;}
function _v2(a,b){if(b===undefined)return typeof a==='number'?[a,a]:[a[0],a[1]];if(typeof a==='number'&&typeof b==='number')return[a,b];var c=_fl([a,b]);return c.length===1?[c[0],c[0]]:[c[0],c[1]];}
function _v3(a,b,c){if(b===undefined)return typeof a==='number'?[a,a,a]:[a[0],a[1],a[2]];if(c===undefined){var m=_fl([a,b]);return m.length===1?[m[0],m[0],m[0]]:[m[0],m[1],m[2]];}if(typeof a==='number'&&typeof b==='number'&&typeof c==='number')return[a,b,c];var q=_fl([a,b,c]);if(q.length===1)return[q[0],q[0],q[0]];return[q[0],q[1],q[2]];}
function _v4(a,b,c,d){if(b===undefined)return typeof a==='number'?[a,a,a,a]:[a[0],a[1],a[2],a[3]];if(c===undefined||d===undefined){var q=_fl([a,b,c,d]);if(q.length===1)return[q[0],q[0],q[0],q[0]];return[q[0],q[1],q[2],q[3]];}if(typeof a==='number'&&typeof b==='number'&&typeof c==='number'&&typeof d==='number')return[a,b,c,d];var r=_fl([a,b,c,d]);if(r.length===1)return[r[0],r[0],r[0],r[0]];return[r[0],r[1],r[2],r[3]];}
function _m2(){var c=_fl(arguments);if(c.length!==4)throw new Error('mat2x2 constructor needs 4 components');return new Float32Array(c);}
function _m3(){var c=_fl(arguments);if(c.length!==9)throw new Error('mat3x3 constructor needs 9 components');return new Float32Array(c);}
function _m4(){var c=_fl(arguments);if(c.length!==16)throw new Error('mat4x4 constructor needs 16 components');return new Float32Array(c);}
function _mn(m){return m.length===16?4:m.length===9?3:m.length===4?2:0;}
function _matmul(a,b){var n=_mn(a);if(!n||n!==_mn(b))throw new Error('CPU preview: only square matrices multiply');var o=new Float32Array(n*n),i,c,r,k,s;for(c=0;c<n;c++)for(r=0;r<n;r++){s=0;for(k=0;k<n;k++)s+=a[k*n+r]*b[c*n+k];o[c*n+r]=s;}return o;}
function _matvec(m,v){var n=_mn(m);if(!n)throw new Error('CPU preview: only square matrices');var o=new Array(n),i,c,s;for(i=0;i<n;i++){s=0;for(c=0;c<n;c++)s+=m[c*n+i]*v[c];o[i]=s;}return o;}
function _vecmat(v,m){var n=_mn(m);if(!n)throw new Error('CPU preview: only square matrices');var o=new Array(n),c,i,s;for(c=0;c<n;c++){s=0;for(i=0;i<n;i++)s+=v[i]*m[c*n+i];o[c]=s;}return o;}
// 二項演算 — クロージャ生成を避けるため各演算を明示分岐 (ホットパス)
function _add(a,b){
  if(typeof a==='number')return typeof b==='number'?a+b:(b.length===2?[a+b[0],a+b[1]]:b.length===3?[a+b[0],a+b[1],a+b[2]]:[a+b[0],a+b[1],a+b[2],a+b[3]]);
  if(typeof b==='number')return a.length===2?[a[0]+b,a[1]+b]:a.length===3?[a[0]+b,a[1]+b,a[2]+b]:[a[0]+b,a[1]+b,a[2]+b,a[3]+b];
  if(a.length!==b.length)throw new Error('vector length mismatch in +');
  return a.length===2?[a[0]+b[0],a[1]+b[1]]:a.length===3?[a[0]+b[0],a[1]+b[1],a[2]+b[2]]:[a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3]];}
function _sub(a,b){
  if(typeof a==='number')return typeof b==='number'?a-b:(b.length===2?[a-b[0],a-b[1]]:b.length===3?[a-b[0],a-b[1],a-b[2]]:[a-b[0],a-b[1],a-b[2],a-b[3]]);
  if(typeof b==='number')return a.length===2?[a[0]-b,a[1]-b]:a.length===3?[a[0]-b,a[1]-b,a[2]-b]:[a[0]-b,a[1]-b,a[2]-b,a[3]-b];
  if(a.length!==b.length)throw new Error('vector length mismatch in -');
  return a.length===2?[a[0]-b[0],a[1]-b[1]]:a.length===3?[a[0]-b[0],a[1]-b[1],a[2]-b[2]]:[a[0]-b[0],a[1]-b[1],a[2]-b[2],a[3]-b[3]];}
function _mul(a,b){
  if(a instanceof Float32Array){if(b instanceof Float32Array)return _matmul(a,b);return _matvec(a,b);}
  if(b instanceof Float32Array)return _vecmat(a,b);
  if(typeof a==='number')return typeof b==='number'?a*b:(b.length===2?[a*b[0],a*b[1]]:b.length===3?[a*b[0],a*b[1],a*b[2]]:[a*b[0],a*b[1],a*b[2],a*b[3]]);
  if(typeof b==='number')return a.length===2?[a[0]*b,a[1]*b]:a.length===3?[a[0]*b,a[1]*b,a[2]*b]:[a[0]*b,a[1]*b,a[2]*b,a[3]*b];
  if(a.length!==b.length)throw new Error('vector length mismatch in *');
  return a.length===2?[a[0]*b[0],a[1]*b[1]]:a.length===3?[a[0]*b[0],a[1]*b[1],a[2]*b[2]]:[a[0]*b[0],a[1]*b[1],a[2]*b[2],a[3]*b[3]];}
function _div(a,b){
  if(typeof a==='number')return typeof b==='number'?a/b:(b.length===2?[a/b[0],a/b[1]]:b.length===3?[a/b[0],a/b[1],a/b[2]]:[a/b[0],a/b[1],a/b[2],a/b[3]]);
  if(typeof b==='number'){var ib=1/b;return a.length===2?[a[0]*ib,a[1]*ib]:a.length===3?[a[0]*ib,a[1]*ib,a[2]*ib]:[a[0]*ib,a[1]*ib,a[2]*ib,a[3]*ib];}
  if(a.length!==b.length)throw new Error('vector length mismatch in /');
  return a.length===2?[a[0]/b[0],a[1]/b[1]]:a.length===3?[a[0]/b[0],a[1]/b[1],a[2]/b[2]]:[a[0]/b[0],a[1]/b[1],a[2]/b[2],a[3]/b[3]];}
function _mod(a,b){
  if(typeof a==='number')return typeof b==='number'?a%b:(b.length===2?[a%b[0],a%b[1]]:b.length===3?[a%b[0],a%b[1],a%b[2]]:[a%b[0],a%b[1],a%b[2],a%b[3]]);
  if(typeof b==='number')return a.length===2?[a[0]%b,a[1]%b]:a.length===3?[a[0]%b,a[1]%b,a[2]%b]:[a[0]%b,a[1]%b,a[2]%b,a[3]%b];
  if(a.length!==b.length)throw new Error('vector length mismatch in %');
  return a.length===2?[a[0]%b[0],a[1]%b[1]]:a.length===3?[a[0]%b[0],a[1]%b[1],a[2]%b[2]]:[a[0]%b[0],a[1]%b[1],a[2]%b[2],a[3]%b[3]];}
function _neg(a){if(typeof a==='number')return -a;return a.length===2?[-a[0],-a[1]]:a.length===3?[-a[0],-a[1],-a[2]]:[-a[0],-a[1],-a[2],-a[3]];}
function _shl(a,b){return _bin(a,b,function(x,y){return x<<y;});}
function _shr(a,b){return _bin(a,b,function(x,y){return x>>>y;});}
function _bnd(a,b){return _bin(a,b,function(x,y){return x&y;});}
function _bor(a,b){return _bin(a,b,function(x,y){return x|y;});}
function _bxr(a,b){return _bin(a,b,function(x,y){return x^y;});}
function _bin(a,b,f){var la=Array.isArray(a),lb=Array.isArray(b);
  if(!la&&!lb)return f(a,b);
  if(la&&!lb){var o1=new Array(a.length);for(var i=0;i<a.length;i++)o1[i]=f(a[i],b);return o1;}
  if(!la&&lb){var o2=new Array(b.length);for(var j=0;j<b.length;j++)o2[j]=f(a,b[j]);return o2;}
  var n=Math.min(a.length,b.length),o=new Array(n);for(var k=0;k<n;k++)o[k]=f(a[k],b[k]);return o;}
function _eq(a,b){
  if(typeof a==='number'||typeof a==='boolean')return a===b;
  if(typeof b==='number'||typeof b==='boolean')return a===b;
  if(a.length!==b.length)return false;
  for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;}
function _ne(a,b){return !_eq(a,b);}
function _cmp2(a,b,f){ // ベクトル比較 == != 以外はスカラのみ (WGSL 準拠)
  return f(a,b);}
function _fld(e,i){return Array.isArray(e)?e[i]:e[_FLD[i]];}
function _idx(e,i){
  if(e instanceof Float32Array){var n=_mn(e);if(!n)throw new Error('CPU preview: matrix indexing');var o=new Array(n);for(var c=0;c<n;c++)o[c]=e[i*n+c];return o;}
  return e[i];}
function _swz(e,s){ // 例: s='rgb' → [e[0],e[1],e[2]] (配列想定。曖昧時は _fld 経由)
  var o=new Array(s.length);for(var i=0;i<s.length;i++){var ch=s[i];o[i]=e[ch==='x'||ch==='r'?0:ch==='y'||ch==='g'?1:ch==='z'||ch==='b'?2:3];}return o;}
function _round(x){if(typeof x==='number')return x<0?-Math.round(-x):Math.round(x);var o=new Array(x.length);for(var i=0;i<x.length;i++)o[i]=x[i]<0?-Math.round(-x[i]):Math.round(x[i]);return o;}
function _fract(x){if(typeof x==='number')return x-Math.floor(x);var o=new Array(x.length);for(var i=0;i<x.length;i++)o[i]=x[i]-Math.floor(x[i]);return o;}
function _sat1(x){return x<0?0:x>1?1:x;}
function _sat(x){if(typeof x==='number')return _sat1(x);var o=new Array(x.length);for(var i=0;i<x.length;i++)o[i]=_sat1(x[i]);return o;}
function _min(a,b){return _bin(a,b,Math.min);}
function _max(a,b){return _bin(a,b,Math.max);}
function _clamp(x,lo,hi){
  var vx=Array.isArray(x),vl=Array.isArray(lo),vh=Array.isArray(hi);
  if(!vx&&!vl&&!vh)return x<lo?lo:x>hi?hi:x;
  var n=vx?x.length:(vl?lo.length:hi.length),o=new Array(n),i;
  for(i=0;i<n;i++){var X=vx?x[i]:x,L=vl?lo[i]:lo,H=vh?hi[i]:hi;o[i]=X<L?L:X>H?H:X;}return o;}
function _mix(x,y,t){
  var vt=Array.isArray(t);
  if(!vt){var vx=Array.isArray(x);
    if(!vx)return x+(y-x)*t;
    if(x.length===2)return[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t];
    if(x.length===3)return[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t];
    return[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t,x[3]+(y[3]-x[3])*t];}
  var n=x.length,o=new Array(n),i;for(i=0;i<n;i++)o[i]=x[i]+(y[i]-x[i])*t[i];return o;}
function _step(e,x){var ve=Array.isArray(e),vx=Array.isArray(x);if(!ve&&!vx)return x<e?0:1;var n=ve?e.length:x.length,o=new Array(n);for(var i=0;i<n;i++){var E=ve?e[i%e.length]:e,X=vx?x[i%x.length]:x;o[i]=X<E?0:1;}return o;}
function _smooth(lo,hi,x){
  var vl=Array.isArray(lo),vh=Array.isArray(hi),vx=Array.isArray(x);
  if(!vl&&!vh&&!vx){var t=_sat1((x-lo)/(hi-lo));return t*t*(3-2*t);}
  var n=vx?x.length:(vl?lo.length:hi.length),o=new Array(n);
  for(var i=0;i<n;i++){var L=vl?lo[i%lo.length]:lo,H=vh?hi[i%hi.length]:hi,X=vx?x[i%x.length]:x;var t2=_sat1((X-L)/(H-L));o[i]=t2*t2*(3-2*t2);}return o;}
function _sel(f,t,c){
  if(typeof c==='boolean')return c?t:f;
  var o=new Array(c.length);for(var i=0;i<c.length;i++){var C=c[i];o[i]=C?(Array.isArray(t)?t[i%t.length]:t):(Array.isArray(f)?f[i%f.length]:f);}return o;}
function _dot(a,b){var s=0;for(var i=0;i<a.length;i++)s+=a[i]*b[i];return s;}
function _cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function _len(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i]*a[i];return Math.sqrt(s);}
function _dist(a,b){var s=0;for(var i=0;i<a.length;i++){var d=a[i]-b[i];s+=d*d;}return Math.sqrt(s);}
function _norm(a){var l=_len(a);return l>0?[a[0]/l,a[1]/l,a[2]/l]:[0,0,0];}function _refl(e,n){var d=2*_dot(n,e);return[e[0]-d*n[0],e[1]-d*n[1],e[2]-d*n[2]];}
function _refr(I,N,eta){var d=_dot(N,I);var k=1-eta*eta*(1-d*d);if(k<0)return[0,0,0];var t=eta*d-Math.sqrt(k);return[eta*I[0]-t*N[0],eta*I[1]-t*N[1],eta*I[2]-t*N[2]];}
function _ff(v,n){var d=_dot(n,v);return d<0?[v[0],v[1],v[2]]:[-v[0],-v[1],-v[2]];}
function _any(v){for(var i=0;i<v.length;i++)if(v[i])return true;return false;}
function _all(v){for(var i=0;i<v.length;i++)if(!v[i])return false;return true;}
function _map1(x,f){if(typeof x==='number')return f(x);var o=new Array(x.length);for(var i=0;i<x.length;i++)o[i]=f(x[i]);return o;}
function _pow(a,b){return _bin(a,b,Math.pow);}
var _DISCARD = {__wgslDiscard:true};
function _throwDiscard(){throw _DISCARD;}
`;

// 組み込み関数 → 生成コード内のヘルパー名の対応。
const BUILTINS = {
  sin: '_sinx', cos: '_cosx', tan: '_tanx', asin: '_asinx', acos: '_acosx', atan: '_atanx',
  sinh: '_sinhx', cosh: '_coshx', tanh: '_tanhx',
  atan2: '_atan2x', abs: '_absx', ceil: '_ceilx', floor: '_floorx', round: '_round',
  trunc: '_truncx', fract: '_fract', sign: '_signx', sqrt: '_sqrtx', inverseSqrt: '_isqrtx',
  exp: '_expx', exp2: '_exp2x', log: '_logx', log2: '_log2x', pow: '_pow', mod: '_modx',
  min: '_min', max: '_max', clamp: '_clamp', mix: '_mix', step: '_step',
  smoothstep: '_smooth', select: '_sel', length: '_len', distance: '_dist',
  dot: '_dot', cross: '_cross', normalize: '_norm', reflect: '_refl', refract: '_refr',
  faceForward: '_ff', all: '_all', any: '_any', saturate: '_sat',
  radians: '_rad', degrees: '_deg',
  dpdx: '_deriv0', dpdy: '_deriv0', dpdxCoarse: '_deriv0', dpdyCoarse: '_deriv0',
  dpdxFine: '_deriv0', dpdyFine: '_deriv0', fwidth: '_deriv0', fwidthCoarse: '_deriv0', fwidthFine: '_deriv0'
}

// ------------------------------------------------------------- tokenizer --

const SWZ_RE = /^[xyzw]{1,4}$|^[rgba]{1,4}$/
const SWZ_IDX = { x: 0, y: 1, z: 2, w: 3, r: 0, g: 1, b: 2, a: 3 }

function tokenize(src) {
  const toks = []
  let i = 0, line = 1
  const n = src.length
  const isDigit = c => c >= '0' && c <= '9'
  const isIdentStart = c => /[A-Za-z_]/.test(c)
  const isIdent = c => /[A-Za-z0-9_]/.test(c)
  while (i < n) {
    const c = src[i]
    if (c === '\n') { line++; i++; continue }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++ }
      i += 2
      continue
    }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] || ''))) {
      let j = i
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        j = i + 2
        while (j < n && /[0-9a-fA-F]/.test(src[j])) j++
        let v = parseInt(src.slice(i, j), 16)
        if (/[uif]/.test(src[j] || '') && !isIdent(src[j + 1] || '')) j++
        toks.push({ t: 'num', v, line })
        i = j
        continue
      }
      while (j < n && isDigit(src[j])) j++
      if (src[j] === '.') { j++; while (j < n && isDigit(src[j])) j++ }
      if (src[j] === 'e' || src[j] === 'E') {
        let k = j + 1
        if (src[k] === '+' || src[k] === '-') k++
        if (isDigit(src[k] || '')) { while (k < n && isDigit(src[k])) k++; j = k }
      }
      const text = src.slice(i, j)
      let v = parseFloat(text)
      if (/[uif]/.test(src[j] || '') && !isIdent(src[j + 1] || '')) j++ // 接尾辞 (1u, 1.5f 等)
      toks.push({ t: 'num', v, line })
      i = j
      continue
    }
    if (isIdentStart(c)) {
      let j = i
      while (j < n && isIdent(src[j])) j++
      toks.push({ t: 'id', v: src.slice(i, j), line })
      i = j
      continue
    }
    // 句読点 (長いものから)
    const three = src.substr(i, 3)
    if (three === '<<=' || three === '>>=') { toks.push({ t: 'p', v: three, line }); i += 3; continue }
    const two = src.substr(i, 2)
    if (['<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '++', '--'].includes(two)) {
      toks.push({ t: 'p', v: two, line }); i += 2; continue
    }
    if ('+-*/%(){}[]<>=!&|^.,;:?~@'.includes(c)) { toks.push({ t: 'p', v: c, line }); i++; continue }
    throw new ParseError(line, `unexpected character '${c}'`)
  }
  toks.push({ t: 'eof', v: '', line })
  return toks
}

class ParseError extends Error {
  constructor(line, message) { super(message); this.line = line }
}

// ---------------------------------------------------------------- parser --

const TYPE_SCALARS = new Set(['f32', 'i32', 'u32', 'bool', 'f16', 'abstract-float', 'abstract-int'])
const RESERVED_STMT = new Set(['enable', 'requires', 'const_assert'])

function vecTypeInfo(name) {
  // vec2f / vec3u / vec4i / vec2b ...
  const m = /^vec([234])([fiub])$/.exec(name)
  if (!m) return null
  return { size: +m[1] }
}
function matTypeInfo(name) {
  const m = /^mat([234])x([234])([f])$/.exec(name)
  if (!m) return null
  return { cols: +m[1], rows: +m[2] }
}

class Parser {
  constructor(toks, opts = {}) {
    this.toks = toks
    this.pos = 0
    this.opts = opts
    this.structs = {}   // name → [fieldName, ...]
    this.aliases = {}   // name → typeName
    this.moduleFns = new Set()
    this.moduleVars = new Set()
    this.uses = { derivatives: false, pointers: false, discard: false }
    this.externals = new Set(opts.externals || [])
  }

  peek(k = 0) { return this.toks[Math.min(this.pos + k, this.toks.length - 1)] }
  next() { return this.toks[this.pos++] }
  at(v) { const t = this.peek(); return (t.t === 'p' || t.t === 'id') && t.v === v }
  eat(v) { if (this.at(v)) { this.pos++; return true } return false }
  expect(v) {
    if (!this.eat(v)) {
      const t = this.peek()
      throw new ParseError(t.line, `expected '${v}' but found ${t.t === 'eof' ? 'end of file' : `'${t.v}'`}`)
    }
  }
  skipAttrs() { while (this.at('@')) { this.next(); this.next(); if (this.eat('(')) { let d = 1; while (d > 0) { const t = this.next(); if (t.t === 'eof') break; if (t.v === '(') d++; else if (t.v === ')') d-- } } } }

  // ---- 型 ----
  parseType() {
    // array<T, N> | ptr<...> | 名前
    if (this.at('<')) { /* shouldn't happen */ }
    const t = this.next()
    if (t.t !== 'id') throw new ParseError(t.line, `expected a type, found '${t.v}'`)
    if (t.v === 'array') {
      this.expect('<')
      const elem = this.parseType()
      let count = null
      if (this.eat(',')) {
        const c = this.next()
        count = c.v
        if (c.t !== 'num') throw new ParseError(c.line, 'array count must be a literal')
      }
      this.expect('>')
      return { kind: 'array', elem, count }
    }
    if (t.v === 'ptr') {
      this.uses.pointers = true
      throw new ParseError(t.line, 'pointer types (ptr<...>) are not supported by the CPU preview. They work only in the WebGPU preview.')
    }
    if (TYPE_SCALARS.has(t.v)) return { kind: 'scalar', name: t.v }
    const vi = vecTypeInfo(t.v)
    if (vi) return { kind: 'vec', size: vi.size, name: t.v }
    const mi = matTypeInfo(t.v)
    if (mi) return { kind: 'mat', cols: mi.cols, rows: mi.rows, name: t.v }
    if (this.structs[t.v] || this.aliases[t.v] !== undefined) return { kind: 'named', name: t.v }
    if (['texture_2d', 'texture_depth_2d', 'sampler', 'atomic'].some(x => t.v.startsWith(x))) {
      throw new ParseError(t.line, `type '${t.v}' is not allowed in shader packs`)
    }
    return { kind: 'named', name: t.v }
  }

  resolveType(ty) {
    let guard = 0
    while (ty && ty.kind === 'named' && this.aliases[ty.name] !== undefined && guard++ < 16) {
      ty = this.aliases[ty.name]
    }
    return ty
  }

  // ---- モジュール ----
  parseModule() {
    const items = []
    while (this.peek().t !== 'eof') {
      this.skipAttrs()
      const t = this.peek()
      if (t.t !== 'id') throw new ParseError(t.line, `unexpected token '${t.v}' at module scope`)
      if (t.v === 'struct') { items.push(this.parseStruct()); continue }
      if (t.v === 'const') { items.push(this.parseModuleConst()); continue }
      if (t.v === 'var') { items.push(this.parseModuleVar()); continue }
      if (t.v === 'alias') { items.push(this.parseAlias()); continue }
      if (t.v === 'fn') { items.push(this.parseFn()); continue }
      if (RESERVED_STMT.has(t.v)) {
        throw new ParseError(t.line, `'${t.v}' is not allowed in shader packs (CPU preview)`)
      }
      throw new ParseError(t.line, `unexpected '${t.v}' at module scope (expected fn/struct/const/var/alias)`)
    }
    return items
  }

  parseStruct() {
    this.expect('struct')
    const name = this.next().v
    this.expect('{')
    const fields = []
    while (!this.eat('}')) {
      this.skipAttrs()
      const fname = this.next().v
      this.expect(':')
      const fty = this.parseType()
      fields.push({ name: fname, type: fty })
      this.eat(',')
      this.eat(';')
    }
    this.structs[name] = fields.map(f => f.name)
    return { kind: 'structDecl', name, fields, line: this.peek().line }
  }

  parseModuleConst() {
    this.expect('const')
    const name = this.next().v
    let ty = null
    if (this.eat(':')) ty = this.parseType()
    this.expect('=')
    const init = this.parseExpr()
    this.expect(';')
    this.moduleVars.add(name)
    return { kind: 'moduleConst', name, ty, init }
  }

  parseModuleVar() {
    this.expect('var')
    if (this.eat('<')) { this.next(); this.expect('>') } // var<private> のみ想定
    const name = this.next().v
    let ty = null
    if (this.eat(':')) ty = this.parseType()
    let init = null
    if (this.eat('=')) init = this.parseExpr()
    this.expect(';')
    this.moduleVars.add(name)
    return { kind: 'moduleVar', name, ty, init }
  }

  parseAlias() {
    this.expect('alias')
    const name = this.next().v
    this.expect('=')
    const ty = this.parseType()
    this.expect(';')
    this.aliases[name] = ty
    return { kind: 'aliasDecl', name, ty }
  }

  parseFn() {
    this.expect('fn')
    const name = this.next().v
    this.moduleFns.add(name)
    this.expect('(')
    const params = []
    while (!this.eat(')')) {
      this.skipAttrs()
      const pname = this.next().v
      this.eat(':')
      this.parseType() // 型は JS では不要 (参考として破棄)
      params.push(pname)
      this.eat(',')
    }
    let ret = null
    if (this.eat('->')) ret = this.parseType()
    const body = this.parseBlock()
    return { kind: 'fnDecl', name, params, ret, body }
  }

  // ---- 文 ----
  parseBlock() {
    this.expect('{')
    const stmts = []
    while (!this.eat('}')) stmts.push(this.parseStmt())
    return stmts
  }

  parseStmt() {
    this.skipAttrs()
    const t = this.peek()
    if (t.t === 'id') {
      switch (t.v) {
        case 'let': return this.parseLet()
        case 'var': return this.parseVarStmt()
        case 'const': return this.parseLet('const')
        case 'if': return this.parseIf()
        case 'for': return this.parseFor()
        case 'while': return this.parseWhile()
        case 'loop': return this.parseLoop()
        case 'switch': return this.parseSwitch()
        case 'return': {
          this.next()
          let e = null
          if (!this.at(';')) e = this.parseExpr()
          this.expect(';')
          return { kind: 'return', e }
        }
        case 'discard': {
          this.next(); this.expect(';')
          this.uses.discard = true
          return { kind: 'discard' }
        }
        case 'break': { this.next(); this.expect(';'); return { kind: 'break' } }
        case 'continue': { this.next(); this.expect(';'); return { kind: 'continue' } }
        case 'const_assert': throw new ParseError(t.line, 'const_assert is not allowed in shader packs')
        case 'enable': case 'requires': throw new ParseError(t.line, `'${t.v}' is not allowed in shader packs`)
      }
    }
    if (t.t === 'p' && t.v === '{') return { kind: 'block', body: this.parseBlock() }
    // 代入 / 複合代入 / インクリメント / 式文
    const lhs = this.parsePostfixExpr()
    const op = this.peek()
    if (op.t === 'p' && ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^='].includes(op.v)) {
      this.next()
      const rhs = this.parseExpr()
      this.expect(';')
      return { kind: 'assign', lhs, op: op.v, rhs }
    }
    if (op.t === 'p' && (op.v === '++' || op.v === '--')) {
      this.next()
      this.expect(';')
      return { kind: 'incdec', lhs, op: op.v }
    }
    // 式文 (呼び出しなど)
    if (lhs.kind !== 'call') throw new ParseError(op.line, `expected an assignment or a call, found '${op.v}'`)
    this.expect(';')
    return { kind: 'exprStmt', e: lhs }
  }

  parseLet(kw = 'let') {
    this.expect(kw)
    const name = this.next().v
    if (this.eat(':')) this.parseType()
    this.expect('=')
    const init = this.parseExpr()
    this.expect(';')
    return { kind: 'let', name, init, isConst: kw === 'const' }
  }

  parseVarStmt() {
    this.expect('var')
    const name = this.next().v
    let ty = null
    if (this.eat(':')) ty = this.parseType()
    let init = null
    if (this.eat('=')) init = this.parseExpr()
    this.expect(';')
    return { kind: 'let', name, ty, init, isConst: false }
  }

  parseIf() {
    this.expect('if')
    // WGSL: if (cond) { } else if ... / else { }
    this.expect('(')
    const cond = this.parseExpr()
    this.expect(')')
    const then = this.parseBlock()
    let els = null
    if (this.at('else')) {
      this.next()
      if (this.at('if')) els = [this.parseIf()]
      else els = this.parseBlock()
    }
    return { kind: 'if', cond, then, els }
  }

  parseFor() {
    this.expect('for')
    this.expect('(')
    let init = null
    if (!this.at(';')) {
      if (this.at('let') || this.at('var') || this.at('const')) init = this.parseLet(this.peek().v)
      else init = { kind: 'exprStmt', e: this.parseExpr(), semi: true }
    } else this.next()
    let cond = null
    if (!this.at(';')) cond = this.parseExpr()
    this.expect(';')
    let step = null
    if (!this.at(')')) {
      // i++ / i-- (WGSL の for ステップは文形式)
      const save = this.pos
      const lhsTry = this.parsePostfixExpr()
      if (this.at('++') || this.at('--')) {
        const op = this.next().v
        step = { kind: 'incdec', lhs: lhsTry, op }
      } else {
        this.pos = save
        step = this.parseExpr()
      }
    }
    this.expect(')')
    const body = this.parseBlock()
    return { kind: 'for', init, cond, step, body }
  }

  parseWhile() {
    this.expect('while')
    this.expect('(')
    const cond = this.parseExpr()
    this.expect(')')
    const body = this.parseBlock()
    return { kind: 'while', cond, body }
  }

  parseLoop() {
    this.expect('loop')
    const body = this.parseBlock()
    return { kind: 'loop', body }
  }

  parseSwitch() {
    this.expect('switch')
    this.expect('(')
    const e = this.parseExpr()
    this.expect(')')
    this.expect('{')
    const cases = []
    while (!this.eat('}')) {
      if (this.at('case')) {
        this.next()
        const selectors = [this.parseExpr()]
        while (this.eat(',')) selectors.push(this.parseExpr())
        this.expect(':')
        cases.push({ selectors, body: this.parseCaseBody() })
      } else if (this.at('default')) {
        this.next()
        this.expect(':')
        cases.push({ selectors: null, body: this.parseCaseBody() })
      } else {
        const t = this.peek()
        throw new ParseError(t.line, `expected 'case' or 'default' in switch, found '${t.v}'`)
      }
    }
    return { kind: 'switch', e, cases }
  }

  parseCaseBody() {
    const stmts = []
    while (!this.at('case') && !this.at('default') && !this.at('}')) {
      stmts.push(this.parseStmt())
    }
    return stmts
  }

  // ---- 式 ----
  parseExpr() { return this.parseBinary(0) }

  parseBinary(level) {
    // 優先順位 (低 → 高)。単項は最上位の後。
    const LEVELS = [
      ['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='],
      ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']
    ]
    if (level >= LEVELS.length) return this.parseUnary()
    let lhs = this.parseBinary(level + 1)
    for (;;) {
      const t = this.peek()
      if (t.t !== 'p' || !LEVELS[level].includes(t.v)) return lhs
      this.next()
      const rhs = this.parseBinary(level + 1)
      lhs = { kind: 'bin', op: t.v, lhs, rhs, line: t.line }
    }
  }

  parseUnary() {
    const t = this.peek()
    if (t.t === 'p' && (t.v === '-' || t.v === '!')) {
      this.next()
      return { kind: 'un', op: t.v, e: this.parseUnary(), line: t.line }
    }
    if (t.t === 'p' && t.v === '~') {
      this.next()
      return { kind: 'un', op: '~', e: this.parseUnary(), line: t.line }
    }
    if (t.t === 'p' && (t.v === '&' || t.v === '*')) {
      this.uses.pointers = true
      throw new ParseError(t.line, `pointers ('${t.v}') are not supported by the CPU preview. They work only in the WebGPU preview.`)
    }
    return this.parsePostfixExpr()
  }

  parsePostfixExpr() {
    let e = this.parsePrimary()
    for (;;) {
      if (this.at('.')) {
        this.next()
        const name = this.next().v
        e = { kind: 'postfix', base: e, sel: name }
      } else if (this.at('[')) {
        this.next()
        const idx = this.parseExpr()
        this.expect(']')
        e = { kind: 'index', base: e, idx }
      } else return e
    }
  }

  parsePrimary() {
    const t = this.next()
    if (t.t === 'num') return { kind: 'num', v: t.v }
    if (t.t === 'id') {
      if (t.v === 'true') return { kind: 'num', v: true }
      if (t.v === 'false') return { kind: 'num', v: false }
      // テンプレート形式のコンストラクタ: vec3<f32>(...) / array<vec3f, 4>(...)
      if (this.at('<') && /^(vec[234]|mat[234]x[234]|array)$/.test(t.v)) {
        this.next() // <
        this.parseType()
        if (this.eat(',')) this.next() // 要素数 (無視)
        this.expect('>')
      }
      if (this.at('(')) {
        this.next()
        const args = []
        if (!this.eat(')')) {
          args.push(this.parseExpr())
          while (this.eat(',')) {
            if (this.at(')')) break // 末尾カンマ許容
            args.push(this.parseExpr())
          }
          this.expect(')')
        }
        return { kind: 'call', name: t.v, args, line: t.line }
      }
      return { kind: 'id', name: t.v, line: t.line }
    }
    if (t.t === 'p' && t.v === '(') {
      const e = this.parseExpr()
      this.expect(')')
      return e
    }
    throw new ParseError(t.line, `unexpected token '${t.v}' in expression`)
  }
}

// --------------------------------------------------------------- codegen --

class Codegen {
  constructor(parser) {
    this.p = parser
    this.errors = []
    this.lines = []
    this.indent = 1
    // 構造体フィールド名の全体集合 (曖昧な .x 判定用)
    this.allStructFields = new Set()
    for (const fs of Object.values(this.p.structs)) for (const f of fs) this.allStructFields.add(f)
  }

  emit(s) { this.lines.push('  '.repeat(this.indent) + s) }

  // 型のゼロ値式
  zeroExpr(ty) {
    const t = this.p.resolveType(ty)
    if (!t) return '0'
    switch (t.kind) {
      case 'scalar': return t.name === 'bool' ? 'false' : '0'
      case 'vec': return '[' + Array(t.size).fill('0').join(',') + ']'
      case 'mat': {
        const n = t.cols * t.rows
        return `new Float32Array(${n})`
      }
      case 'array': {
        const n = t.count ? Math.min(1024, t.count | 0) : 0
        const z = this.zeroExprFull(t.elem)
        return '[' + Array(n).fill(z).join(',') + ']'
      }
      case 'named': return this.structZero(t.name)
    }
    return '0'
  }

  structZero(name) {
    const item = this.p.items.find(i => i.kind === 'structDecl' && i.name === name)
    if (!item) return '0'
    const parts = item.fields.map(f => `${f.name}: ${this.zeroExprFull(f.type)}`).join(', ')
    return `{${parts}}`
  }

  zeroExprFull(ty) {
    const t = this.p.resolveType(ty)
    if (t && t.kind === 'named' && this.p.structs[t.name]) return this.structZero(t.name)
    return this.zeroExpr(ty)
  }

  // 式 → JS
  genExpr(e, scope) {
    switch (e.kind) {
      case 'num': return String(e.v)
      case 'id': {
        if (scope.has(e.name) || this.p.moduleFns.has(e.name) || this.p.moduleVars.has(e.name) || this.p.externals.has(e.name)) {
          return e.name
        }
        // unknown identifier
        this.errors.push({ line: e.line || 0, message: `'${e.name}' is not declared (unknown identifier)` })
        return e.name
      }
      case 'call': return this.genCall(e, scope)
      case 'postfix': {
        const base = this.genExpr(e.base, scope)
        if (SWZ_RE.test(e.sel) && !this.allStructFields.has(e.sel)) {
          // 純スウィズル → 配列アクセス
          if (e.sel.length === 1) return `${base}[${SWZ_IDX[e.sel]}]`
          return `[${[...e.sel].map(c => `${base}[${SWZ_IDX[c]}]`).join(', ')}]`
        }
        if (SWZ_RE.test(e.sel)) {
          // 曖昧 (構造体フィールドと同名) → 実行時判定
          if (e.sel.length === 1) return `_fld(${base}, ${SWZ_IDX[e.sel]})`
          return `[${[...e.sel].map(c => `_fld(${base}, ${SWZ_IDX[c]})`).join(', ')}]`
        }
        return `${base}.${e.sel}`
      }
      case 'index': {
        const base = this.genExpr(e.base, scope)
        const idx = this.genExpr(e.idx, scope)
        return `_idx(${base}, ${idx})`
      }
      case 'bin': return this.genBin(e, scope)
      case 'un': {
        const v = this.genExpr(e.e, scope)
        if (e.op === '-') return `_neg(${v})`
        if (e.op === '!') return `(!(${v}))`
        if (e.op === '~') return `(~(${v}))`
        return v
      }
    }
    return '0'
  }

  genBin(e, scope) {
    const a = this.genExpr(e.lhs, scope)
    const b = this.genExpr(e.rhs, scope)
    switch (e.op) {
      case '+': return `_add(${a}, ${b})`
      case '-': return `_sub(${a}, ${b})`
      case '*': return `_mul(${a}, ${b})`
      case '/': return `_div(${a}, ${b})`
      case '%': return `_mod(${a}, ${b})`
      case '<<': return `_shl(${a}, ${b})`
      case '>>': return `_shr(${a}, ${b})`
      case '&': return `_bnd(${a}, ${b})`
      case '|': return `_bor(${a}, ${b})`
      case '^': return `_bxr(${a}, ${b})`
      case '==': return `_eq(${a}, ${b})`
      case '!=': return `_ne(${a}, ${b})`
      case '<': return `(${a} < ${b})`
      case '>': return `(${a} > ${b})`
      case '<=': return `(${a} <= ${b})`
      case '>=': return `(${a} >= ${b})`
      case '&&': return `((${a}) && (${b}))`
      case '||': return `((${a}) || (${b}))`
    }
  }

  genCall(e, scope) {
    const name = e.name
    const args = e.args.map(a => this.genExpr(a, scope))
    // 1) 型コンストラクタ
    const bareVec = /^vec([234])$/.exec(name) // vec3<f32>(...) の形式 (テンプレート部は parsePrimary で消費済み)
    if (bareVec) return `_${'v' + bareVec[1]}(${args.join(', ')})`
    if (name === 'array') return `[${args.join(', ')}]` // array<T, N>(...) — 要素数は実行時チェックされない
    if (name === 'f32') return `_castf(${args.join(', ')})`
    if (name === 'u32') return `_castu(${args.join(', ')})`
    if (name === 'i32') return `_casti(${args.join(', ')})`
    if (name === 'bool') return `_castb(${args.join(', ')})`
    if (name === 'f16' || name === 'vec2h' || name === 'vec3h' || name === 'vec4h') {
      this.errors.push({ line: e.line, message: 'f16 types are not allowed in shader packs' })
      return '0'
    }
    const vi = vecTypeInfo(name)
    if (vi) return `_${'v' + vi.size}(${args.join(', ')})`
    const mi = matTypeInfo(name)
    if (mi) {
      if (mi.cols !== mi.rows) {
        this.errors.push({ line: e.line, message: `CPU preview supports only square matrices (${name} is ${mi.cols}x${mi.rows})` })
      }
      return `_${'m' + mi.cols}(${args.join(', ')})`
    }
    if (name === 'vec2' || name === 'vec3' || name === 'vec4') {
      // テンプレート形式 vec3<f32>(...) — ドキュメントではまず出ないが念のため
      // vec3<f32> は '<' を parseType が消費してしまうためここには来ない
    }
    // 2) 構造体コンストラクタ
    if (this.p.structs[name]) {
      const item = this.p.items.find(i => i.kind === 'structDecl' && i.name === name)
      const fields = item.fields
      if (fields.length !== args.length) {
        this.errors.push({ line: e.line, message: `constructor of ${name} expects ${fields.length} arguments, got ${args.length}` })
      }
      // ベクトル型フィールドはコピーして値意味論を守る
      const parts = fields.map((f, i) => {
        const ty = this.p.resolveType(f.type)
        const a = args[i] !== undefined ? args[i] : this.zeroExprFull(f.type)
        if (ty && (ty.kind === 'vec')) return `${f.name}: ${ty.size >= 2 ? `_${'v' + ty.size}(${a})` : a}`
        return `${f.name}: (${a})`
      })
      return `{${parts.join(', ')}}`
    }
    // 3) 組み込み関数
    if (BUILTINS[name]) {
      if (name.startsWith('dpd') || name.startsWith('fwidth')) this.p.uses.derivatives = true
      return `${BUILTINS[name]}(${args.join(', ')})`
    }
    // 4) ユーザー/エンジン関数・外部関数
    if (!this.p.moduleFns.has(name) && !this.p.externals.has(name)) {
      this.errors.push({ line: e.line, message: `'${name}' is not a known function (undeclared identifier)` })
    }
    return `${name}(${args.join(', ')})`
  }

  // 文 → JS
  genStmt(s, scope) {
    switch (s.kind) {
      case 'let': {
        const init = s.init ? this.genExpr(s.init, scope) : this.zeroExprFull(s.ty || { kind: 'scalar', name: 'f32' })
        scope.add(s.name)
        this.emit(`${s.isConst ? 'const' : 'let'} ${s.name} = ${init};`)
        break
      }
      case 'assign': {
        const lhs = this.genLValue(s.lhs, scope)
        const rhs = this.genExpr(s.rhs, scope)
        if (s.op === '=') this.emit(`${lhs} = ${rhs};`)
        else {
          const op = { '+=': '_add', '-=': '_sub', '*=': '_mul', '/=': '_div', '%=': '_mod', '<<=': '_shl', '>>=': '_shr', '&=': '_bnd', '|=': '_bor', '^=': '_bxr' }[s.op]
          this.emit(`${lhs} = ${op}(${lhs}, ${rhs});`)
        }
        break
      }
      case 'incdec': {
        const lhs = this.genLValue(s.lhs, scope)
        this.emit(`${lhs} = ${s.op === '++' ? '_add' : '_sub'}(${lhs}, 1);`)
        break
      }
      case 'if': {
        this.emit(`if (${this.genExpr(s.cond, scope)}) {`)
        this.genBlock(s.then, scope)
        if (s.els) {
          if (Array.isArray(s.els)) { this.emit('} else {'); this.genStmts(s.els, scope) }
          else { this.emit('} else {'); this.genBlock(s.els, scope) }
        }
        this.emit('}')
        break
      }
      case 'for': {
        const inner = new Set(scope)
        let initJs = ''
        if (s.init) {
          if (s.init.kind === 'let') {
            initJs = `${s.init.isConst ? 'const' : 'let'} ${s.init.name} = ${this.genExpr(s.init.init, inner)}`
            inner.add(s.init.name)
          }
          else if (s.init.kind === 'exprStmt') initJs = this.genExpr(s.init.e, inner)
        }
        const condJs = s.cond ? this.genExpr(s.cond, inner) : ''
        let stepJs = ''
        if (s.step) {
          if (s.step.kind === 'incdec') {
            const lhs = this.genLValue(s.step.lhs, inner)
            stepJs = `${lhs} = ${s.step.op === '++' ? '_add' : '_sub'}(${lhs}, 1)`
          } else stepJs = this.genExpr(s.step, inner)
        }
        this.emit(`for (${initJs}; ${condJs}; ${stepJs}) {`)
        this.genBlock(s.body, inner)
        this.emit('}')
        break
      }
      case 'while': {
        this.emit(`while (${this.genExpr(s.cond, scope)}) {`)
        this.genBlock(s.body, scope)
        this.emit('}')
        break
      }
      case 'loop': {
        this.emit('for (;;) {')
        this.genBlock(s.body, scope)
        this.emit('}')
        break
      }
      case 'switch': {
        this.emit(`switch (${this.genExpr(s.e, scope)}) {`)
        for (const c of s.cases) {
          if (c.selectors) {
            for (const sel of c.selectors) this.emit(`case ${this.genExpr(sel, scope)}:`)
          } else this.emit('default:')
          this.indent++
          this.genStmts(c.body, scope)
          this.emit('break;') // WGSL の case は fallthrough しない
          this.indent--
        }
        this.emit('}')
        break
      }
      case 'return': {
        this.emit(s.e ? `return ${this.genExpr(s.e, scope)};` : 'return;')
        break
      }
      case 'discard': this.emit('return _throwDiscard();'); break
      case 'break': this.emit('break;'); break
      case 'continue': this.emit('continue;'); break
      case 'block': this.emit('{'); this.genBlock(s.body, scope); this.emit('}'); break
      case 'exprStmt': this.emit(`${this.genExpr(s.e, scope)};`); break
    }
  }

  genBlock(stmts, scope) {
    const inner = new Set(scope)
    this.genStmts(stmts, inner)
  }
  genStmts(stmts, scope) {
    for (const s of stmts) this.genStmt(s, scope)
  }

  // 代入左辺 (postfix 式の JS 化 — スウィズル単一成分は [i] へ)
  genLValue(e, scope) {
    switch (e.kind) {
      case 'id': return e.name
      case 'postfix': {
        const base = this.genLValue(e.base, scope)
        if (SWZ_RE.test(e.sel) && e.sel.length === 1 && !this.allStructFields.has(e.sel)) {
          return `${base}[${SWZ_IDX[e.sel]}]`
        }
        if (SWZ_RE.test(e.sel) && e.sel.length === 1) {
          this.errors.push({ line: 0, message: `ambiguous write target '.${e.sel}' (struct field vs vector component) is not supported by the CPU preview` })
          return `${base}.${e.sel}`
        }
        if (SWZ_RE.test(e.sel)) {
          this.errors.push({ line: 0, message: `cannot assign to multi-component swizzle '.${e.sel}' (not valid WGSL)` })
          return `${base}.${e.sel}`
        }
        return `${base}.${e.sel}`
      }
      case 'index': {
        const base = this.genLValue(e.base, scope)
        return `${base}[${this.genExpr(e.idx, scope)}]`
      }
    }
    this.errors.push({ line: 0, message: 'invalid assignment target' })
    return '__invalid__'
  }
}

// --------------------------------------------------------------- export ---

export function transpileWgsl(source, opts = {}) {
  const errors = []
  let toks, parser, codegen
  try {
    toks = tokenize(source)
  } catch (err) {
    return { js: null, errors: [{ line: err.line || 0, message: err.message }], uses: null }
  }
  parser = new Parser(toks, opts)
  let items
  try {
    items = parser.parseModule()
  } catch (err) {
    return { js: null, errors: [{ line: err.line || 0, message: err.message }], uses: parser.uses }
  }
  parser.items = items
  codegen = new Codegen(parser)

  const body = []
  const push = (s = '') => body.push(s)

  // 外部バインド
  const externals = opts.externals || []
  for (const name of externals) push(`  var ${name} = $__env.${name};`)

  // モジュール要素
  for (const item of items) {
    switch (item.kind) {
      case 'structDecl': break // コード不要 (ctor はインライン)
      case 'aliasDecl': break
      case 'moduleConst': {
        const init = codegen.genExpr(item.init, new Set([...parser.moduleVars, ...parser.moduleFns, ...parser.externals]))
        push(`  const ${item.name} = ${init};`)
        break
      }
      case 'moduleVar': {
        const init = item.init
          ? codegen.genExpr(item.init, new Set([...parser.moduleVars, ...parser.moduleFns, ...parser.externals]))
          : codegen.zeroExprFull(item.ty || { kind: 'scalar', name: 'f32' })
        push(`  let ${item.name} = ${init};`)
        break
      }
      case 'fnDecl': {
        const scope = new Set(item.params)
        for (const n of parser.moduleVars) scope.add(n)
        for (const n of parser.moduleFns) scope.add(n)
        for (const n of parser.externals) scope.add(n)
        codegen.lines = []
        codegen.indent = 1
        codegen.genStmts(item.body, scope)
        const fnBody = codegen.lines.join('\n')
        body.push(`  function ${item.name}(${item.params.join(', ')}) {\n${fnBody}\n  }`)
        break
      }
    }
  }

  // エクスポート (宣言されたものだけ — 前処理で消えたフックは undefined 参照を避ける)
  const exportNames = [
    ...parser.moduleFns,
    ...[...parser.moduleVars]
  ]
  const exportObj = '{ ' + exportNames.map(n => `${n}`).join(', ') + ' }'
  // 注: モジュール const は再代入不能なので let でなく const だが export は参照で良い

  const js = [
    '(function($__env) {',
    '"use strict";',
    HELPERS_SRC,
    // 追加ヘルパー (トランスパイラが必要とするもの)
    `
var _sinx = function(x){return _map1(x, Math.sin);};
var _cosx = function(x){return _map1(x, Math.cos);};
var _tanx = function(x){return _map1(x, Math.tan);};
var _asinx = function(x){return _map1(x, Math.asin);};
var _acosx = function(x){return _map1(x, Math.acos);};
var _atanx = function(x){return _map1(x, Math.atan);};
var _sinhx = function(x){return _map1(x, Math.sinh);};
var _coshx = function(x){return _map1(x, Math.cosh);};
var _tanhx = function(x){return _map1(x, Math.tanh);};
var _atan2x = function(a,b){return _bin(a,b,Math.atan2);};
var _absx = function(x){return _map1(x, Math.abs);};
var _ceilx = function(x){return _map1(x, Math.ceil);};
var _floorx = function(x){return _map1(x, Math.floor);};
var _truncx = function(x){return _map1(x, Math.trunc);};
var _signx = function(x){return _map1(x, Math.sign);};
var _sqrtx = function(x){return _map1(x, Math.sqrt);};
var _isqrtx = function(x){return _map1(x, function(v){return 1/Math.sqrt(v);});};
var _expx = function(x){return _map1(x, Math.exp);};
var _exp2x = function(x){return _map1(x, function(v){return Math.pow(2,v);});};
var _logx = function(x){return _map1(x, Math.log);};
var _log2x = function(x){return _map1(x, Math.log2);};
var _modx = function(a,b){return _mod(a,b);};
var _rad = function(x){return _map1(x, function(v){return v*Math.PI/180;});};
var _deg = function(x){return _map1(x, function(v){return v*180/Math.PI;});};
var _deriv0 = function(x){return typeof x==='number'?0:(Array.isArray(x)?new Array(x.length).fill(0):x);};
var _castf = function(x){return _map1(x, function(v){return +v;});};
var _castu = function(x){return _map1(x, function(v){return v>>>0;});};
var _casti = function(x){return _map1(x, function(v){return v|0;});};
var _castb = function(x){return _map1(x, function(v){return !!v;});};
`,
    ...body,
    '  return ' + exportObj + ';',
    '})'
  ].join('\n')

  return { js, errors: codegen.errors, uses: parser.uses, moduleFns: [...parser.moduleFns] }
}

// 生成された JS を評価してモジュールオブジェクトを返す。
export function evalWgslModule(js, env) {
  const factory = new Function('return ' + js)()
  return factory(env || {})
}
