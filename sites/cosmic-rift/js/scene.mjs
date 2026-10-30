/** Procedural black hole: generated on-device, no images or external requests. */
const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
uniform vec2 resolution;uniform float time;uniform float pulse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec2 p=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.;
 p*=1.+pulse*.035;
 float angle=-.14;mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));p=rot*p;
 float r=length(p);float core=.438;
 vec3 color=vec3(.012,.010,.024)*exp(-r*1.1);
 float aura=exp(-pow((r-.48)*2.6,2.))*.075;
 color+=vec3(.32,.16,.65)*aura;
 vec2 d=vec2(p.x,p.y/.215);float dr=length(d);float theta=atan(d.y,d.x);
 float texture=noise(vec2(theta*28.+time*.035,dr*70.))+noise(vec2(theta*64.,dr*210.-time*.06))*.35;
 float bands=.7+.22*sin(dr*128.+texture*3.)+.14*sin(dr*253.-texture*4.);
 float disc=smoothstep(.47,.56,dr)*(1.-smoothstep(1.,1.65,dr))*bands;
 disc*=.5+texture*.8;disc*=.85+.22*p.x;
 float discMask=smoothstep(core-.015,core+.012,r);
 float front=step(p.y,0.0)*smoothstep(.52,.62,dr)*(1.-smoothstep(.75,1.25,dr));
 float luminosity=disc*max(discMask,front*.9);
 color+=vec3(.72,.44,.96)*luminosity*.85;
 color+=vec3(1.,.87,1.)*pow(max(0.,luminosity),3.)*.65;
 float photon=exp(-abs(r-.459)*145.);float halo=exp(-abs(r-.468)*29.);
 float arcs=.8+.2*sin(atan(p.y,p.x)*4.+.7);
 color+=vec3(.72,.48,1.)*halo*.32*arcs;
 color+=vec3(1.,.89,1.)*photon*.9;
 float lensR=length(vec2(p.x,p.y*1.14));float lens=exp(-abs(lensR-.49)*70.)*smoothstep(.02,.17,p.y);
 color+=vec3(.95,.72,1.)*lens*.65;
 color*=mix(smoothstep(core-.015,core+.008,r),1.,front);
 float fine=exp(-abs(p.y+.003)*85.)*smoothstep(.43,.5,abs(p.x))*(1.-smoothstep(.8,1.62,abs(p.x)));
 color+=vec3(.86,.68,1.)*fine*.35;
 color+=vec3(.48,.28,.83)*exp(-pow(p.x*.6,2.)-pow(p.y*4.,2.))*.025;
 float vignette=1.-smoothstep(.9,1.9,r)*.5;
 float alpha=max(1.-smoothstep(core-.008,core+.01,r),clamp(max(color.r,max(color.g,color.b))*3.,0.,1.));
 gl_FragColor=vec4(color*vignette,alpha);
}`;
export class BlackHoleScene {
 constructor(canvas,{force2D=false}={}){this.canvas=canvas;this.lastFrame=0;this.pulseAt=-1e6;this.failed=false;
  try{if(force2D)throw 0;this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});if(!this.gl)throw 0;const gl=this.gl,compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw 0;gl.useProgram(program);this.program=program;const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);this.uniforms={resolution:gl.getUniformLocation(program,'resolution'),time:gl.getUniformLocation(program,'time'),pulse:gl.getUniformLocation(program,'pulse')};}
  catch{this.failed=true;this.gl=null;const fallback=canvas.cloneNode(false);canvas.replaceWith(fallback);this.canvas=fallback;this.ctx=fallback.getContext('2d');}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.canvas);this.resize();
 }
 resize(){const rect=this.canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.max(1,Math.round(rect.width*scale));this.canvas.height=Math.max(1,Math.round(rect.height*scale));if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.render(performance.now(),true,this.wasReduced||false);}
 pulse(){this.pulseAt=performance.now();}
 render(now,force=false,reduced=false){if(!force&&(now-this.lastFrame<50||(reduced&&this.wasReduced)))return;this.wasReduced=reduced;this.lastFrame=now;const c=this.canvas;
  if(this.gl){this.gl.uniform2f(this.uniforms.resolution,c.width,c.height);this.gl.uniform1f(this.uniforms.time,reduced?0:now/1000);this.gl.uniform1f(this.uniforms.pulse,reduced?0:Math.max(0,1-(now-this.pulseAt)/350));this.gl.drawArrays(this.gl.TRIANGLES,0,6);}
  else {const ctx=this.ctx;if(!ctx)return;const x=c.width/2,y=c.height/2,r=c.height*.22;ctx.clearRect(0,0,c.width,c.height);const glow=ctx.createRadialGradient(x,y,r*.9,x,y,r*2);glow.addColorStop(0,'#b889f04f');glow.addColorStop(1,'#8f5fc100');ctx.fillStyle=glow;ctx.fillRect(0,0,c.width,c.height);ctx.save();ctx.translate(x,y);ctx.rotate(-.14);for(let i=50;i>0;i--){ctx.beginPath();ctx.ellipse(0,0,r*(1.2+i/50),r*(.24+i/240),0,0,Math.PI*2);ctx.strokeStyle=`rgba(181,136,246,${.025+(50-i)*.001})`;ctx.lineWidth=2;ctx.stroke();}ctx.shadowColor='#b68aeb';ctx.shadowBlur=r*.3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle='#04030a';ctx.fill();ctx.strokeStyle='#ddc1ff';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
 }
}
