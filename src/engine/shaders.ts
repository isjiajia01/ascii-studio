export const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2));
  gl_Position = vec4(p*2.-1., 0., 1.);
}`;

export const ASCII_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform sampler2D uAtlas;
uniform vec2 uRes, uCell, uSrcSize;
uniform int uMode, uGlyphs, uColorMode;
uniform float uTiles, uTone, uShade, uRandom, uTileBg;
uniform vec3 uFg, uBg, uP0, uP1, uP2;
uniform float uBgAlpha, uContrast, uBright, uInvert, uEdge, uTime, uRain;
out vec4 o;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
const float BAYER[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
float bayer(vec2 p){ ivec2 q=ivec2(mod(p,4.)); return (BAYER[q.x+q.y*4]+.5)/16.; }
const vec3 LEGO[10] = vec3[10](vec3(.96,.96,.94),vec3(.1,.1,.11),vec3(.77,.1,.1),vec3(.96,.46,.13),vec3(.98,.82,.14),vec3(.2,.6,.25),vec3(.1,.35,.75),vec3(.45,.27,.6),vec3(.55,.35,.2),vec3(.6,.6,.62));

vec3 samp(vec2 uvTop, float lod){ return textureLod(uSrc, vec2(uvTop.x, 1.-uvTop.y), lod).rgb; }
vec3 adj(vec3 c){ c=clamp((c-.5)*uContrast+.5+uBright,0.,1.); return mix(c,1.-c,uInvert); }
vec3 gradient(float t){ t=clamp(t,0.,1.); return t<.5 ? mix(uP0,uP1,t*2.) : mix(uP1,uP2,(t-.5)*2.); }
vec3 baseColor(vec3 c, float l){ if(uColorMode==1) return c*1.05; if(uColorMode==2) return gradient(l); return uFg; }

float rainv(vec2 cell){
  float h=hash(vec2(cell.x,7.)); float sp=.6+h*1.2; float len=6.+hash(vec2(cell.x,3.))*16.;
  float rows=ceil(uRes.y/uCell.y);
  float pos=fract(uTime*sp*.12+h*10.)*(rows+len);
  float d=pos-cell.y; return (d<0.||d>len) ? 0. : 1.-d/len;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  vec3 col = uBg; float cov = 0.;
  float lod0 = log2(max(max(uCell.x/uRes.x*uSrcSize.x, uCell.y/uRes.y*uSrcSize.y), 1.));

  if(uMode==6){ // film
    vec2 uv = vec2(gl_FragCoord.x/uRes.x, 1.-p.y/uRes.y);
    vec3 c = adj(textureLod(uSrc, uv, 0.).rgb);
    vec3 hal = textureLod(uSrc, uv, 4.).rgb;
    c += vec3(1.,.35,.2)*max(lum(hal)-.6,0.)*.5;
    float l = lum(c);
    c = mix(vec3(l), c, .8) * vec3(1.06,1.0,.9);
    c = c*c*(3.-2.*c)*.55 + c*.45;
    float g = hash(gl_FragCoord.xy + floor(uTime*24.)*13.7)-.5;
    c += g*.16;
    vec2 d = uv-.5; c *= 1.-dot(d,d)*.9;
    c = clamp(c,0.,1.); l = lum(c);
    col = uColorMode==1 ? c : (uColorMode==2 ? gradient(l) : mix(uBg, uFg, l));
    cov = 1.;
  } else {
    vec2 cell = floor(p/uCell); vec2 loc = fract(p/uCell);
    vec2 ctr = (cell+.5)*uCell/uRes;
    vec3 c = adj(samp(ctr, lod0)); float l = lum(c);
    if(uRain>0.){ float r=rainv(cell); float k=mix(1.,.08+1.5*r,uRain); l=clamp(l*k,0.,1.); c*=k; }

    if(uMode==0){
      float n=float(uGlyphs);
      float t=floor(pow(l,uTone)*(n-.001));
      if(uRandom>.5) t=1.+floor(hash(cell+floor(uTime*3.)*1.7)*(n-1.));
      if(uTileBg>.5) t=1.+floor(hash(cell)*(n-1.));
      float shade = mix(1., l, uShade);
      bool edge=false;
      if(uEdge>0.){
        vec2 oo = uCell/uRes;
        float gx = lum(adj(samp(ctr+vec2(oo.x,0.),lod0))) - lum(adj(samp(ctr-vec2(oo.x,0.),lod0)));
        float gy = lum(adj(samp(ctr+vec2(0.,oo.y),lod0))) - lum(adj(samp(ctr-vec2(0.,oo.y),lod0)));
        if(length(vec2(gx,gy)) > mix(.9,.07,uEdge)){
          float a=mod(atan(gy,gx)+1.5708,3.14159);
          float e = (a<.3927||a>2.7489)?0.:(a<1.1781?3.:(a<1.9635?2.:1.));
          t=n+e; edge=true; shade=1.;
        }
      }
      vec2 auv = vec2((t+clamp(loc.x,.02,.98))/uTiles, clamp(loc.y,.02,.98));
      float g = texture(uAtlas, auv).a;
      if(uRandom>.5 && !edge) g*=smoothstep(.05,.35,l);
      vec3 bc = baseColor(c,l)*shade;
      if(uTileBg>.5){
        vec3 tile = uColorMode==0 ? mix(uBg,uFg,l) : baseColor(c,l);
        float gap = smoothstep(0.,.07,min(min(loc.x,1.-loc.x),min(loc.y,1.-loc.y)));
        vec3 ink = lum(tile)>.45 ? vec3(.035) : vec3(.95);
        col=mix(tile,ink,g*.9*smoothstep(.015,.18,l)); cov=gap;
      } else { col=bc; cov=g; }
    }
    else if(uMode==1){ // round dots
      float r=sqrt(l)*.75; float d=length(loc-.5); float aa=1.2/uCell.x;
      cov = l<=0. ? 0. : 1.-smoothstep(r-aa,r+aa,d); col = baseColor(c,l);
    }
    else if(uMode==2){ // dither
      float on = l>bayer(cell) ? 1.:0.;
      vec3 b = uColorMode==1 ? c/max(max(c.r,max(c.g,c.b)),.02) : baseColor(c,l);
      col=b; cov=on;
    }
    else if(uMode==3){ // bricks
      vec3 q;
      if(uColorMode==1){
        float best=1e9; q=LEGO[0];
        for(int i=0;i<10;i++){ vec3 dd=c-LEGO[i]; float s=dot(dd,dd); if(s<best){best=s;q=LEGO[i];} }
      } else { float level=floor(l*4.+.5)/4.; q=uColorMode==0 ? mix(uBg,uFg,level) : baseColor(c,level); }
      vec2 dq=loc-.5; float d=length(dq);
      float edgeD=max(abs(dq.x),abs(dq.y));
      float stud=(1.-smoothstep(.30,.34,d));
      vec3 b=q*(.8+.2*stud);
      b*=1.+.28*stud*(1.-smoothstep(-.3,.1,dq.x+dq.y));
      b*=1.-.35*smoothstep(.30,.36,d)*(1.-smoothstep(-.2,.2,-(dq.x+dq.y)));
      b*=1.-smoothstep(.44,.5,edgeD)*.55;
      col=b; cov=1.;
    }
    else if(uMode==4){ // braille
      vec2 sub=loc*vec2(2.,4.); vec2 id=floor(sub); vec2 f=fract(sub)-.5;
      vec2 dctr=(cell*uCell+(id+.5)*uCell/vec2(2.,4.))/uRes;
      vec3 dc=adj(samp(dctr,max(lod0-2.,0.))); float dl=lum(dc);
      if(uRain>0.){ dl*=mix(1.,.08+1.5*rainv(cell),uRain); }
      float thr=mix(.5,bayer(cell*vec2(2.,4.)+id),.6);
      float on=dl>thr?1.:0.;
      vec2 subSize=uCell/vec2(2.,4.);
      float d=length(f*subSize); float radius=min(subSize.x,subSize.y)*.34;
      cov=on*(1.-smoothstep(max(0.,radius-.65),radius+.65,d));
      col=baseColor(c,l);
    }
    else if(uMode==5){ // particles
      vec2 h=vec2(hash(cell),hash(cell+7.31));
      vec2 ce=.5+.2*vec2(sin(uTime*.9+h.x*6.283),cos(uTime*.8+h.y*6.283));
      float r=.04+.3*pow(l,1.1)*(.85+.15*sin(uTime*1.5+h.x*9.));
      float d=length(loc-ce);
      float core=l>.04?(1.-smoothstep(r*.55,r,d)):0.;
      float halo=l>.04?exp(-d*d/(r*r*2.2+.002))*.5:0.;
      cov=clamp(core+halo,0.,1.); col=baseColor(c,l)*(.6+.8*l);
    }
    else if(uMode==7){ // drifting pixels
      vec2 fl=vec2(sin(cell.y*.12+uTime*.8),cos(cell.x*.1+uTime*.7))*3.+vec2(uTime*2.,0.);
      vec2 sc=(floor(cell+fl)+.5)*uCell/uRes; sc=fract(sc);
      vec3 c2=adj(samp(sc,lod0)); float l2=lum(c2);
      float on=l2>bayer(cell+floor(uTime*3.))?1.:0.;
      vec3 b = uColorMode==1 ? c2/max(max(c2.r,max(c2.g,c2.b)),.02) : baseColor(c2,l2);
      col=b; cov=on;
    }
  }
  float a = mix(uBgAlpha, 1., cov);
  o = vec4(mix(uBg*uBgAlpha, col, cov), a);
}`;

export const POST_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes;
uniform float uGlow, uScan, uCrt, uAb, uGrain, uFlick, uTime;
out vec4 o;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  float inside = 1.;
  vec2 d0 = uv-.5;
  if(uCrt>0.){
    d0 *= 1.+uCrt*.22*dot(d0,d0)*2.; uv = d0+.5;
    if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) inside=0.;
    uv=clamp(uv,0.,1.);
  }
  vec2 off = (uv-.5)*uAb*.03;
  vec4 s = textureLod(uTex, uv, 0.);
  vec3 col = s.rgb;
  if(uAb>0.){ col = vec3(textureLod(uTex,uv+off,0.).r, s.g, textureLod(uTex,uv-off,0.).b); }
  if(uGlow>0.){
    vec3 bl = textureLod(uTex,uv,2.).rgb*.4+textureLod(uTex,uv,4.).rgb*.35+textureLod(uTex,uv,6.).rgb*.25;
    col += bl*uGlow*1.8;
  }
  if(uScan>0.){
    float pitch=max(3.,uRes.y/200.);
    float sl=.5+.5*sin(gl_FragCoord.y/pitch*6.2832);
    col *= 1.-uScan*.5*(1.-sl);
  }
  if(uFlick>0.){
    col *= 1.+(hash(vec2(floor(uTime*30.),1.))-.5)*uFlick*.3+sin(uTime*55.)*.03*uFlick;
  }
  if(uGrain>0.){
    col += (hash(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*uGrain*.4;
  }
  if(uCrt>0.){ col *= 1.-dot(d0,d0)*uCrt*1.1; }
  float a = s.a;
  col = clamp(col,0.,1.);
  o = vec4(col*inside, a*inside + (1.-inside)*0.);
  if(a>=.999) o.a=1.;
}`;
