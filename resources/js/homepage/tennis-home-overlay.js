(function () {
  'use strict';
  window.initTennisHome = function initTennisHome(config) {
    const canvas = config.canvas;
    const button = config.button;
    if (!canvas || !button) throw new Error('Tennis overlay needs a canvas and a native ball button.');
    if (canvas.__tennisHomeDispose) canvas.__tennisHomeDispose();
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable.');
    const ropeCanvas = config.ropeCanvas&&config.ropeCanvas!==canvas?config.ropeCanvas:null;
    const ropeContext = ropeCanvas?ropeCanvas.getContext('2d'):null;
    const avatar = config.avatar;
    const watermark = config.watermark;
    const status = config.status;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const removers = [];
    const hitTimers = new Map();
    let W = 1, H = 1, dpr = 1, raf = 0, layoutRAF = 0, lastFrame = 0;
    let disposed = false, dragging = false, pointerId = null, initialized = false;
    let pointerSamples = [], dragOrigin = null, dragOffset = { x: 0, y: 0 }, dragDistance = 0;
    let previousPointer = null, lastRacket = -1000, lastYearHit = -1000, lastStatus = -1000;
    let trailOn = config.trailInput ? !!config.trailInput.checked : true, soundOn = false;
    let audio = null, sphere = null, pulses = [], ring = null, platforms = [], textRects = [];
    const ropeCount=32;
    let rope=[],ropePin=null,ropeSleeping=true,ropeQuietFrames=0,ropeAnchor=null,ropeLastMoved=0;
    let trailHistory=[],trailSample=null;
    const trailLifetime=1450,trailLimit=160;
    let rest = null, anchoredToAvatar = true, glowTimer = 0, serveCount = 0;
    let followTarget = null, following = false, followBlockedUntil = 0, followTimer = 0, followTimerAt = 0;
    let followVersion = 0, arrivedVersion = -1;
    let parked = false, parkKey = null;
    let lastHighServe=-1,highServeSource=null,serveTarget=null,highServeFlightUntil=0,homeFlight=null;
    let heldHomeFlight=null,homeHoldStarted=0,homeRetryTimer=0,homeRetryCount=0,homeServeArmed=true;
    const ballLayer = document.createElement('canvas'), ballLayerContext = ballLayer.getContext('2d');
    let signature = null, signatureRaster = null, signatureBehind = false, signatureInside = false;
    let signatureDepthPending = true, signatureWasDragging = false, signaturePrevious = null, signatureFollowVersion = -1;
    let signatureMix = 0, signatureBlendActive = false, signatureLastDraw = 0, signatureOcclusion = 0;
    const followCooldown = 4000;
    const colors = { ball: '#ccdd30', seam: '#fbf7d8', shadow: '#352044', purple: '#4d0099' };
    const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 28, q: [.06, .16, -.12, .978], spin: 0, sleeping: true };
    function listen(el, name, fn, options) {
      if (!el) return;
      el.addEventListener(name, fn, options);
      removers.push(() => el.removeEventListener(name, fn, options));
    }
    function say(message, force) {
      const now = performance.now();
      if (!status || (!force && now - lastStatus < 1300)) return;
      lastStatus = now;
      status.textContent = message;
    }
    function illuminate() {
      if (!watermark) return;
      watermark.classList.add('is-struck');
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => watermark.classList.remove('is-struck'), 700);
    }
    function enableAudio() {
      if (!soundOn) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { if (!audio) audio = new AC(); audio.resume().catch(() => {}); } catch (_) {}
    }
    function sound(speed) {
      if (!soundOn || !audio || audio.state !== 'running') return;
      const now = audio.currentTime;
      try {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(140 + Math.min(1000, speed) * .12, now);
        oscillator.frequency.exponentialRampToValueAtTime(70, now + .065);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.028, now + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(now); oscillator.stop(now + .1);
      } catch (_) {}
    }
    function buildSphere() {
      const size = 144;
      const off = document.createElement('canvas'); off.width = off.height = size;
      const c = off.getContext('2d'), img = c.createImageData(size, size), base = [204, 221, 48];
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const x = (px + .5 - size / 2) / (size / 2), y = (py + .5 - size / 2) / (size / 2), rr = x*x+y*y;
        if (rr > 1) continue;
        const z = Math.sqrt(1 - rr), diffuse = Math.max(0, -.43*x-.57*y+.70*z);
        const noise = ((Math.sin(px*127.1+py*311.7)*43758.5453)%1)*.028;
        const shade = .47 + .52*diffuse + noise;
        const shine = Math.pow(Math.max(0,-.34*x-.43*y+.835*z), 17)*19;
        const i = (py*size+px)*4;
        img.data[i] = clamp(base[0]*shade+shine, 0, 255);
        img.data[i+1] = clamp(base[1]*shade+shine, 0, 255);
        img.data[i+2] = clamp(base[2]*shade+shine*.55, 0, 255);
        img.data[i+3] = Math.round(clamp((1-Math.sqrt(rr))*size, 0, 1)*255);
      }
      c.putImageData(img, 0, 0); sphere = off;
    }
    function rotate(v) {
      const [x,y,z,w] = ball.q;
      const tx=2*(y*v[2]-z*v[1]), ty=2*(z*v[0]-x*v[2]), tz=2*(x*v[1]-y*v[0]);
      return [v[0]+w*tx+y*tz-z*ty,v[1]+w*ty+z*tx-x*tz,v[2]+w*tz+x*ty-y*tx];
    }
    function turn(ax, ay, az, dt) {
      const magnitude=Math.hypot(ax,ay,az); if (magnitude<.0001) return;
      const theta=magnitude*dt*.5,s=Math.sin(theta)/magnitude,a=[ax*s,ay*s,az*s,Math.cos(theta)],b=ball.q;
      const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
      const norm=Math.hypot(...q); ball.q=q.map(v=>v/norm);
    }
    function measureSignature() {
      signature=null;
      if(!watermark||!watermark.isConnected)return;
      const style=getComputedStyle(watermark),text=watermark.textContent.trim();
      if(!text||style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return;
      let rect;
      try{const range=document.createRange();range.selectNodeContents(watermark);rect=range.getBoundingClientRect();}catch(_){rect=watermark.getBoundingClientRect();}
      if(!rect||rect.width<2||rect.height<2||rect.right<0||rect.left>W||rect.bottom<0||rect.top>H)return;
      const clip={left:0,top:0,right:W,bottom:H};
      for(let parent=watermark.parentElement,level=0;parent&&level<10;parent=parent.parentElement,level++){
        const s=getComputedStyle(parent),r=parent.getBoundingClientRect();
        if(/hidden|clip|scroll|auto/.test(s.overflowX)){clip.left=Math.max(clip.left,r.left);clip.right=Math.min(clip.right,r.right);}
        if(/hidden|clip|scroll|auto/.test(s.overflowY)){clip.top=Math.max(clip.top,r.top);clip.bottom=Math.min(clip.bottom,r.bottom);}
      }
      if(clip.right<=clip.left||clip.bottom<=clip.top)return;
      const size=parseFloat(style.fontSize)||100,spacing=parseFloat(style.letterSpacing)||0,pad=Math.ceil(size*.045)+3;
      const font=[style.fontStyle||'normal',style.fontWeight||'400',style.fontSize,style.fontFamily].join(' ');
      const key=[text,font,spacing,rect.width.toFixed(2),rect.height.toFixed(2)].join('|');
      if(!signatureRaster||signatureRaster.key!==key){
        const mask=document.createElement('canvas'),m=mask.getContext('2d',{willReadFrequently:true});
        if(!m)return;
        m.font=font;m.textBaseline='alphabetic';m.textAlign='left';
        const nativeSpacing='letterSpacing' in m;
        if(nativeSpacing)m.letterSpacing=spacing+'px';
        const metrics=m.measureText(text),ascent=metrics.fontBoundingBoxAscent||metrics.actualBoundingBoxAscent||size*.8,descent=metrics.fontBoundingBoxDescent||metrics.actualBoundingBoxDescent||size*.2;
        const measuredWidth=nativeSpacing?metrics.width:metrics.width+spacing*text.length;
        const width=rect.width+pad*2,height=rect.height+pad*2,scaleY=rect.height/Math.max(1,ascent+descent),scaleX=rect.width/Math.max(1,measuredWidth);
        mask.width=Math.max(1,Math.ceil(width*.7));mask.height=Math.max(1,Math.ceil(height*.7));
        m.setTransform(mask.width/width,0,0,mask.height/height,0,0);m.font=font;m.textBaseline='alphabetic';m.textAlign='left';m.fillStyle='#000';
        if(nativeSpacing)m.letterSpacing=spacing+'px';
        m.translate(pad,pad+ascent*scaleY);m.scale(scaleX,scaleY);
        if(nativeSpacing)m.fillText(text,0,0);
        else {for(let i=0;i<text.length;i++)m.fillText(text[i],m.measureText(text.slice(0,i)).width+i*spacing,0);}
        let data=null;try{data=m.getImageData(0,0,mask.width,mask.height).data;}catch(_){}
        signatureRaster={key,mask,data,width,height};
      }
      signature={...signatureRaster,left:rect.left-pad,top:rect.top-pad,clip};
    }
    function signatureCoverageAt(centerX,centerY,r,inkClip) {
      if(!signature||!signature.data)return 0;
      const {left,top,width,height,mask,data,clip}=signature,step=Math.max(3,r/6);let samples=0,covered=0;
      for(let y=-r;y<=r;y+=step)for(let x=-r;x<=r;x+=step){
        if(x*x+y*y>r*r*.98)continue;samples++;
        const px=centerX+x,py=centerY+y;
        if(px<clip.left||px>=clip.right||py<clip.top||py>=clip.bottom)continue;
        if(inkClip&&(px<inkClip.left||px>inkClip.right||py<inkClip.top||py>inkClip.bottom))continue;
        const mx=Math.floor((px-left)*mask.width/width),my=Math.floor((py-top)*mask.height/height);
        if(mx>=0&&mx<mask.width&&my>=0&&my<mask.height)covered+=data[(my*mask.width+mx)*4+3]/255;
      }
      return samples?covered/samples:0;
    }
    function signatureCoverage() {return signatureCoverageAt(ball.x,ball.y,ball.r);}
    function updateSignatureDepth(now) {
      const previous=signaturePrevious,dx=previous?ball.x-previous.x:0,dy=previous?ball.y-previous.y:0;
      signaturePrevious={x:ball.x,y:ball.y};
      const inDialog=typeof canvas.closest==='function'&&canvas.closest('dialog[open]');
      const foreground=dragging||parked||inDialog||anchoredToAvatar&&ball.sleeping;
      const inside=!!signature&&ball.x+ball.r>Math.max(signature.left,signature.clip.left)&&ball.x-ball.r<Math.min(signature.left+signature.width,signature.clip.right)&&ball.y+ball.r>Math.max(signature.top,signature.clip.top)&&ball.y-ball.r<Math.min(signature.top+signature.height,signature.clip.bottom);
      if(foreground){signatureBehind=false;signatureMix=0;signatureBlendActive=false;signatureWasDragging=dragging;}
      else {
        if(inside&&now<highServeFlightUntil){signatureBehind=true;signatureDepthPending=false;}
        else if(inside&&(!signatureInside||signatureDepthPending||signatureWasDragging)){
          const vx=Math.abs(ball.vx)>3?ball.vx:dx*60,vy=Math.abs(ball.vy)>3?ball.vy:dy*60;
          if(Math.hypot(vx,vy)>4){
            // A rightward pass travels behind the ink; a leftward return passes in front.
            // Near-vertical lobs go behind on the way up. This depth is latched for the pass.
            signatureBehind=Math.abs(vx)>Math.abs(vy)*.28?vx>0:vy<0;signatureDepthPending=false;
          }
        }
        if(!inside)signatureBehind=false;
        signatureWasDragging=false;
        const target=inside&&signatureBehind?1:0,elapsed=Math.min(.04,Math.max(.001,(now-signatureLastDraw)/1000||.016));
        signatureMix=reduced.matches?target:signatureMix+clamp(target-signatureMix,-elapsed/.11,elapsed/.11);
        signatureBlendActive=Math.abs(target-signatureMix)>.002;
      }
      signatureInside=inside;signatureLastDraw=now;
      signatureOcclusion=signatureMix*signatureCoverage();
      button.dataset.behindSignature=String(signatureBehind&&!foreground&&inside);button.dataset.occluded=String(signatureOcclusion>.012);
    }
    function paintBall(ctx) {
      const r=ball.r;
      ctx.save();
      // A small attached shadow follows the object; it never paints a fictitious floor across the page.
      const shadow=ctx.createRadialGradient(ball.x+r*.18,ball.y+r*.7,0,ball.x+r*.18,ball.y+r*.7,r*1.15);
      shadow.addColorStop(0,'rgba(53,32,68,.16)');shadow.addColorStop(1,'rgba(53,32,68,0)');
      ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(ball.x+r*.18,ball.y+r*.7,r*1.16,r*.54,0,0,Math.PI*2);ctx.fill();
      ctx.translate(ball.x,ball.y);ctx.drawImage(sphere,-r,-r,r*2,r*2);
      const seam=[];
      for(let i=0;i<=180;i++){const t=i/180*Math.PI*2,lat=.63*Math.cos(2*t);seam.push(rotate([Math.sin(t)*Math.cos(lat),Math.sin(lat),Math.cos(t)*Math.cos(lat)]));}
      ctx.lineCap='round';
      for(let pass=0;pass<2;pass++){
        ctx.strokeStyle=pass===0?colors.shadow:colors.seam;ctx.globalAlpha=pass===0?.17:.92;
        for(let i=1;i<seam.length;i++){
          const a=seam[i-1],b=seam[i];if(a[2]<.015||b[2]<.015)continue;
          ctx.lineWidth=(pass===0?3.1:1.65)*(r/28)*(.64+.36*b[2]);
          ctx.beginPath();ctx.moveTo(a[0]*r,a[1]*r);ctx.lineTo(b[0]*r,b[1]*r);ctx.stroke();
        }
      }
      ctx.globalAlpha=.32;ctx.strokeStyle=colors.ball;ctx.lineWidth=.55;
      for(let i=0;i<86;i++){const a=i*2.39996323,j=Math.sin(i*27.1)*.5+.5;ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-.3),Math.sin(a)*(r-.3));ctx.lineTo(Math.cos(a)*(r+.3+j*.5),Math.sin(a)*(r+.3+j*.5));ctx.stroke();}
      const p=rotate([0,-.08,.9968]),u=rotate([1,0,0]),v=rotate([0,.9968,.08]);
      if(p[2]>.15){ctx.save();ctx.transform(u[0],u[1],v[0],v[1],p[0]*r,p[1]*r);ctx.globalAlpha=.52*p[2];ctx.fillStyle=colors.shadow;ctx.font='500 '+(r*.26)+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('QT',0,0);ctx.restore();}
      ctx.restore();
      button.style.width=button.style.height=(ball.r*2)+'px';
      button.style.transform='translate3d('+(ball.x-ball.r)+'px,'+(ball.y-ball.r)+'px,0)';
      button.dataset.x=ball.x.toFixed(2);button.dataset.y=ball.y.toFixed(2);
    }
    function drawBall(now) {
      updateSignatureDepth(now);
      if(!ballLayerContext){paintBall(ctx);return;}
      const size=Math.ceil(ball.r*3.2+10),left=ball.x-size/2,top=ball.y-size/2,pixels=Math.ceil(size*dpr),c=ballLayerContext;
      if(ballLayer.width!==pixels||ballLayer.height!==pixels){ballLayer.width=ballLayer.height=pixels;}
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,ballLayer.width,ballLayer.height);
      c.setTransform(pixels/size,0,0,pixels/size,-left*pixels/size,-top*pixels/size);paintBall(c);
      if(signature&&signatureMix>.001){
        const {mask,width,height,clip}=signature;c.save();c.beginPath();c.rect(clip.left,clip.top,clip.right-clip.left,clip.bottom-clip.top);c.clip();
        // Only the isolated ball layer is erased. Trails, page text, and other feedback stay intact.
        c.globalCompositeOperation='source-atop';c.globalAlpha=signatureMix*.65;c.shadowColor='rgba(53,32,68,.25)';c.shadowBlur=2;c.shadowOffsetX=1.3;c.shadowOffsetY=2;
        c.drawImage(mask,signature.left,signature.top,width,height);
        c.shadowColor='transparent';c.shadowBlur=c.shadowOffsetX=c.shadowOffsetY=0;c.globalAlpha=signatureMix;c.globalCompositeOperation='destination-out';c.drawImage(mask,signature.left,signature.top,width,height);c.restore();
      }
      ctx.drawImage(ballLayer,0,0,pixels,pixels,left,top,size,size);
    }
    function effectsVisible() {
      return trailOn&&!disposed&&!(typeof canvas.closest==='function'&&canvas.closest('dialog[open]'));
    }
    function ropeVisible() {return effectsVisible()&&ropePin!==null;}
    function trailVisible() {return effectsVisible()&&ropePin===null;}
    function visualMode() {return !effectsVisible()?'none':ropePin!==null?'rope':'trail';}
    function clearTrail(now) {
      trailHistory=[];trailSample={x:ball.x,y:ball.y,t:now==null?performance.now():now};
    }
    function recordTrail(now) {
      if(!trailVisible()||parked||reduced.matches||anchoredToAvatar&&ball.sleeping){clearTrail(now);return;}
      trailHistory=trailHistory.filter(p=>now-p.t<trailLifetime);
      if(!trailSample){trailSample={x:ball.x,y:ball.y,t:now};return;}
      if(Math.hypot(ball.x-trailSample.x,ball.y-trailSample.y)<.4)return;
      if(!trailHistory.length)trailHistory.push({x:trailSample.x,y:trailSample.y,t:Math.max(trailSample.t,now-32)});
      trailHistory.push({x:ball.x,y:ball.y,t:now});trailSample={x:ball.x,y:ball.y,t:now};
      if(trailHistory.length>trailLimit)trailHistory.splice(0,trailHistory.length-trailLimit);
    }
    function trailNeedsFrame() {return trailVisible()&&!parked&&!reduced.matches&&trailHistory.length>0;}
    function drawTrail(now) {
      recordTrail(now);if(!trailVisible()||trailHistory.length<2)return;
      const c=ropeContext||ctx;c.save();c.strokeStyle=colors.purple;c.lineWidth=1.35;c.lineCap='round';c.lineJoin='round';
      for(let i=1;i<trailHistory.length;i++){
        const a=trailHistory[i-1],b=trailHistory[i],freshness=clamp(1-(now-b.t)/trailLifetime,0,1);
        c.globalAlpha=freshness*.34;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
      }
      c.restore();
    }
    function ropeShape() {
      if(ropePin===null)return [];
      const a={x:ball.x,y:ball.y},b={x:clamp(ropePin.x,4,W-4),y:clamp(ropePin.y,4,H-4)};
      const distance=Math.hypot(b.x-a.x,b.y-a.y),sag=clamp(distance*.16,0,86),points=[];
      for(let i=0;i<ropeCount;i++){
        const t=i/(ropeCount-1);
        points.push({x:clamp(a.x+(b.x-a.x)*t,3,W-3),y:clamp(a.y+(b.y-a.y)*t+Math.sin(Math.PI*t)*sag,3,H-3)});
      }
      points[0]=a;points[ropeCount-1]=b;return points;
    }
    function snapRope() {
      rope=ropeVisible()?ropeShape().map(p=>({...p,vx:0,vy:0})):[];
      ropeAnchor={x:ball.x,y:ball.y};ropeSleeping=true;ropeQuietFrames=0;ropeLastMoved=performance.now();
    }
    function syncRopeAnchor(now) {
      if(!ropeVisible()){ropeSleeping=true;return;}
      if(rope.length!==ropeCount){snapRope();return;}
      const dx=ball.x-(ropeAnchor?ropeAnchor.x:ball.x),dy=ball.y-(ropeAnchor?ropeAnchor.y:ball.y),moved=Math.hypot(dx,dy);
      if(moved>.035){
        ropeAnchor={x:ball.x,y:ball.y};ropeLastMoved=now;ropeQuietFrames=0;ropeSleeping=false;
        if(moved>180){snapRope();return;}
      }
      rope[0].x=ball.x;rope[0].y=ball.y;rope[0].vx=rope[0].vy=0;
      if(reduced.matches||parked)snapRope();
    }
    function stepRope(dt,now) {
      syncRopeAnchor(now);
      if(!ropeVisible()||ropeSleeping||reduced.matches||parked)return;
      const shape=ropeShape(),previous=rope.map(p=>({x:p.x,y:p.y})),last=ropeCount-1;
      for(let i=1;i<ropeCount;i++){
        if(ropePin&&i===last){rope[i].x=shape[i].x;rope[i].y=shape[i].y;rope[i].vx=rope[i].vy=0;continue;}
        const p=rope[i],omega=16-i/last*4,damping=2*omega*.76;
        p.vx+=((shape[i].x-p.x)*omega*omega-p.vx*damping)*dt;
        p.vy+=((shape[i].y-p.y)*omega*omega-p.vy*damping)*dt;
        p.x=clamp(p.x+p.vx*dt,3,W-3);p.y=clamp(p.y+p.vy*dt,3,H-3);
      }
      // Bound stretch while allowing a loose, gravity-shaped strand rather than a glowing motion history.
      for(let pass=0;pass<4;pass++)for(let i=1;i<ropeCount;i++){
        const a=rope[i-1],b=rope[i],dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),limit=Math.max(5,Math.hypot(shape[i].x-shape[i-1].x,shape[i].y-shape[i-1].y)*1.35);
        if(distance<=limit||distance<.001)continue;
        const amount=(distance-limit)/distance,firstFixed=i===1,lastFixed=!!ropePin&&i===last;
        if(firstFixed){b.x-=dx*amount;b.y-=dy*amount;}
        else if(lastFixed){a.x+=dx*amount;a.y+=dy*amount;}
        else {a.x+=dx*amount*.5;a.y+=dy*amount*.5;b.x-=dx*amount*.5;b.y-=dy*amount*.5;}
      }
      let motion=0,error=0;
      for(let i=1;i<ropeCount;i++){
        const p=rope[i];if(!(ropePin&&i===last)){p.vx=clamp((p.x-previous[i].x)/dt,-1800,1800)*.97;p.vy=clamp((p.y-previous[i].y)/dt,-1800,1800)*.97;}
        motion=Math.max(motion,Math.hypot(p.x-previous[i].x,p.y-previous[i].y));error=Math.max(error,Math.hypot(p.x-shape[i].x,p.y-shape[i].y));
      }
      ropeQuietFrames=motion<.055&&error<.7?ropeQuietFrames+1:0;
      if(ropeQuietFrames>10||now-ropeLastMoved>3200)snapRope();
    }
    function ropeNeedsFrame() {return ropeVisible()&&!ropeSleeping&&!reduced.matches&&!parked;}
    function getRope() {return ropeVisible()?rope.map(p=>({x:p.x,y:p.y})):[];}
    function ropeTailState() {
      if(!ropeVisible()||rope.length<2)return {tail:null,tangent:null};
      const tail=rope[rope.length-1],before=rope[rope.length-2],dx=tail.x-before.x,dy=tail.y-before.y,length=Math.hypot(dx,dy)||1;
      return {tail:{x:tail.x,y:tail.y},tangent:{x:dx/length,y:dy/length}};
    }
    function setRopePin(point) {
      if(disposed)return false;
      if(point!=null&&(!Number.isFinite(point.x)||!Number.isFinite(point.y)))return false;
      const next=point?{x:clamp(point.x,4,W-4),y:clamp(point.y,4,H-4)}:null;
      if(!next&&!ropePin||next&&ropePin&&Math.hypot(next.x-ropePin.x,next.y-ropePin.y)<.15)return true;
      const switchedMode=(ropePin===null)!==(next===null);ropePin=next;
      if(switchedMode){rope=[];ropeSleeping=true;clearTrail();}
      ropeSleeping=false;ropeQuietFrames=0;ropeLastMoved=performance.now();
      if(!ropeVisible()){rope=[];ropeSleeping=true;draw(performance.now());return true;}
      if(reduced.matches||parked||rope.length!==ropeCount)snapRope();
      draw(performance.now());if(ropeNeedsFrame())wake();return true;
    }
    function drawRope(now) {
      syncRopeAnchor(now);if(!ropeVisible()||rope.length<2)return;
      const c=ropeContext||ctx;c.save();c.strokeStyle=colors.purple;c.globalAlpha=.36;c.lineWidth=1.3;c.lineCap='round';c.lineJoin='round';
      c.beginPath();c.moveTo(rope[0].x,rope[0].y);
      for(let i=1;i<rope.length-1;i++)c.quadraticCurveTo(rope[i].x,rope[i].y,(rope[i].x+rope[i+1].x)/2,(rope[i].y+rope[i+1].y)/2);
      const tail=rope[rope.length-1];c.lineTo(tail.x,tail.y);c.stroke();c.restore();
    }
    function draw(now) {
      if (disposed) return;
      ctx.clearRect(0,0,W,H);
      if(ropeContext)ropeContext.clearRect(0,0,W,H);
      drawTrail(now);
      drawRope(now);
      if(!reduced.matches){ctx.save();ctx.strokeStyle=colors.purple;ctx.lineWidth=.8;
        pulses.forEach(p=>{const age=(now-p.t)/500;if(age<0||age>1)return;ctx.globalAlpha=(1-age)*.25;ctx.beginPath();ctx.ellipse(p.x,p.y,8+age*23,2+age*7,0,Math.PI,2*Math.PI);ctx.stroke();});ctx.restore();}
      drawBall(now);
      if(!raf&&(ropeNeedsFrame()||trailNeedsFrame()||signatureBlendActive&&ball.sleeping&&!dragging))wake();
    }
    function measureSurfaces() {
      measureSignature();
      ring=null;
      if(avatar&&avatar.isConnected){const r=avatar.getBoundingClientRect();if(r.width>15&&r.height>15&&r.right>0&&r.left<W&&r.bottom>0&&r.top<H)ring={x:r.left+r.width/2,y:r.top+r.height/2,r:Math.min(avatar.offsetWidth||r.width,avatar.offsetHeight||r.height)/2};}
      platforms=[];textRects=[];
      const headers=new Set(Array.from(document.querySelectorAll('.year-header')));
      document.querySelectorAll('.year-title').forEach(label=>{if(!label.closest('.year-header')&&label.parentElement&&label.parentElement.getBoundingClientRect().height<90)headers.add(label.parentElement);});
      headers.forEach(header=>{
        const hr=header.getBoundingClientRect(),label=header.querySelector('.year-title');
        if(!label||hr.width<ball.r*3||hr.height>100||hr.bottom<0||hr.top>H)return;
        const lr=label.getBoundingClientRect(),divider=header.querySelector('.year-divider'),dr=divider&&divider.getBoundingClientRect();
        const y=dr&&dr.width>ball.r*3?dr.top+dr.height*.5:hr.top+hr.height*.5;
        if(y<ball.r*2+5||y>H-ball.r-5)return;
        const labelText=label.textContent.trim(),year=(labelText.match(/\b(?:19|20)\d{2}\b/)||[labelText])[0];
        const ranges=[[Math.max(5,hr.left+4),Math.min(W-5,lr.left-18)],[Math.max(5,lr.right+18),Math.min(W-5,hr.right-4)]];
        ranges.forEach(([left,right])=>{if(right-left>ball.r*2+26)platforms.push({left,right,y,header,year});});
      });
      // Range rectangles describe actual text runs, rather than full-width paragraph boxes.
      // A year ledge is usable only if a resting ball also clears the nearby publication text.
      document.querySelectorAll('.publication-title,.publication-venue,.publication-authors').forEach(el=>{
        const er=el.getBoundingClientRect();if(er.bottom<-ball.r*2||er.top>H||er.width===0)return;
        const range=document.createRange();range.selectNodeContents(el);
        Array.from(range.getClientRects()).forEach(r=>{if(r.width>0&&r.height>0)textRects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom});});
      });
    }
    function safeLanding(x,y) {
      for(const rect of textRects){const dx=x-clamp(x,rect.left,rect.right),dy=y-clamp(y,rect.top,rect.bottom);if(dx*dx+dy*dy<(ball.r+5)*(ball.r+5))return false;}
      return true;
    }
    function avatarPosition() {
      if(ring){
        const distance=ring.r+ball.r+7,x=clamp(ring.x+distance*Math.SQRT1_2,ball.r+3,W-ball.r-3),dx=x-ring.x;
        const y=ring.y+Math.sqrt(Math.max(0,distance*distance-dx*dx));
        return{x,y:clamp(y,ball.r+3,H-ball.r-3)};
      }
      return{x:ball.r+12,y:Math.min(H-ball.r-3,120+ball.r)};
    }
    function clearFollowTimer() {
      if(followTimer)clearTimeout(followTimer);
      followTimer=0;followTimerAt=0;
    }
    function boundedFollowPoint() {
      const r=ball.r;
      return followTarget&&{x:clamp(followTarget.x,r+2,W-r-2),y:clamp(followTarget.y,r+2,H-r-2)};
    }
    function notifyFollowArrival(now) {
      if(!followTarget||arrivedVersion===followVersion)return;
      arrivedVersion=followVersion;
      const key=followTarget.key;
      if(!reduced.matches)pulses.push({x:ball.x,y:Math.min(H-2,ball.y+ball.r),t:now});
      // The caller owns the image and active reading node; arrivals never change page scroll.
      if(typeof config.onImpact==='function'){try{config.onImpact(key);}catch(_) {}}
    }
    function resumeFollow() {
      if(disposed||!followTarget||dragging||parked)return;
      const now=performance.now();
      if(now<followBlockedUntil){scheduleFollowResume();return;}
      clearFollowTimer();if(!following||signatureFollowVersion!==followVersion)signatureDepthPending=true;signatureFollowVersion=followVersion;following=true;anchoredToAvatar=false;rest=null;
      const target=boundedFollowPoint(),distance=Math.hypot(target.x-ball.x,target.y-ball.y);
      if(reduced.matches||distance<.7&&Math.hypot(ball.vx,ball.vy)<12){
        ball.x=target.x;ball.y=target.y;ball.vx=ball.vy=ball.spin=0;ball.sleeping=true;
        notifyFollowArrival(now);draw(now);if(pulses.length)wake();return;
      }
      ball.sleeping=false;wake();
    }
    function scheduleFollowResume() {
      if(disposed||!followTarget||dragging||parked)return;
      const delay=followBlockedUntil-performance.now();
      if(delay<=0){resumeFollow();return;}
      // Updating a target during a gesture must not restart the four-second clock.
      if(followTimer&&Math.abs(followTimerAt-followBlockedUntil)<1)return;
      clearFollowTimer();followTimerAt=followBlockedUntil;
      followTimer=setTimeout(()=>{followTimer=0;followTimerAt=0;resumeFollow();},Math.max(1,Math.ceil(delay)));
    }
    function userInteraction() {
      parked=false;parkKey=null;
      following=false;followBlockedUntil=performance.now()+followCooldown;
      clearFollowTimer();scheduleFollowResume();
    }
    function followTo(target) {
      // Targets are viewport coordinates; a suspended target is updated without taking the ball away.
      if(disposed||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
      const key=target.key==null?null:target.key;
      const sameKey=!!followTarget&&followTarget.key===key;
      if(!sameKey)followVersion++;
      followTarget={x:target.x,y:target.y,key};
      if(parked||dragging||performance.now()<followBlockedUntil){scheduleFollowResume();return true;}
      const point=boundedFollowPoint();
      if(sameKey&&following&&ball.sleeping&&Math.hypot(point.x-ball.x,point.y-ball.y)<.7)return true;
      resumeFollow();return true;
    }
    function clearFollow(keepCooldown) {
      clearFollowTimer();followTarget=null;following=false;if(!keepCooldown)followBlockedUntil=0;followVersion++;arrivedVersion=-1;
    }
    function releaseFollow() {
      if(disposed)return;
      const wasFollowing=following;parked=false;parkKey=null;clearFollow(true);
      // Resume ordinary physics from the current position; reset() remains the explicit home action.
      if(wasFollowing&&!dragging&&!reduced.matches){rest=null;anchoredToAvatar=false;ball.sleeping=false;wake();}
    }
    function parkAt(target) {
      if(disposed||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
      const captured=pointerId;dragging=false;pointerId=null;pointerSamples=[];previousPointer=null;
      if(captured!=null){try{button.releasePointerCapture(captured);}catch(_) {}}
      parked=true;parkKey=target.key==null?null:target.key;following=false;followBlockedUntil=0;highServeFlightUntil=0;homeFlight=null;clearFollowTimer();
      signatureBehind=false;signatureMix=0;signatureBlendActive=false;
      anchoredToAvatar=false;rest=null;pulses=[];
      const radius=ball.r;ball.x=clamp(target.x,radius+2,W-radius-2);ball.y=clamp(target.y,radius+2,H-radius-2);
      ball.vx=ball.vy=ball.spin=0;ball.sleeping=true;
      if(raf){cancelAnimationFrame(raf);raf=0;}clearTrail();snapRope();button.style.cursor='grab';draw(performance.now());return true;
    }
    function reset(announce) {
      if(disposed)return;clearTimeout(homeRetryTimer);homeRetryTimer=0;homeRetryCount=0;homeServeArmed=true;heldHomeFlight=null;dragging=false;pointerId=null;pointerSamples=[];pulses=[];rest=null;anchoredToAvatar=true;
      parked=false;parkKey=null;
      highServeFlightUntil=0;homeFlight=null;
      clearFollow();
      signatureBehind=false;signatureInside=false;signatureDepthPending=true;signatureWasDragging=false;signaturePrevious=null;signatureMix=0;signatureBlendActive=false;signatureOcclusion=0;
      measureSurfaces();const point=avatarPosition();ball.x=point.x;ball.y=point.y;ball.vx=ball.vy=ball.spin=0;ball.sleeping=true;ball.q=[.06,.16,-.12,.978];
      if(raf){cancelAnimationFrame(raf);raf=0;}clearTrail();snapRope();button.style.cursor='grab';draw(performance.now());
      config.onReset?.();
      if(announce!==false)say(ring?'回到头像旁。轻点、拖动，或从旁边挥拍。':'网球已归位。轻点或拖动它。',true);
    }
    function resize() {
      const oldW=W,oldH=H;
      W=Math.max(1,window.innerWidth||document.documentElement.clientWidth);H=Math.max(1,window.innerHeight||document.documentElement.clientHeight);
      ball.r=W<=500?22:28;dpr=Math.min(window.devicePixelRatio||1,W<=500?1.5:2);
      canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(ropeContext){ropeCanvas.width=canvas.width;ropeCanvas.height=canvas.height;ropeContext.setTransform(dpr,0,0,dpr,0,0);}
      measureSurfaces();
      if(!initialized){initialized=true;const p=avatarPosition();ball.x=p.x;ball.y=p.y;}
      else if(parked){const r=ball.r;ball.x=clamp(ball.x,r+2,W-r-2);ball.y=clamp(ball.y,r+2,H-r-2);}
      else if(anchoredToAvatar&&ball.sleeping&&ring){const p=avatarPosition();ball.x=p.x;ball.y=p.y;}
      else{ball.x=clamp(ball.x*W/oldW,ball.r+2,W-ball.r-2);ball.y=clamp(ball.y*H/oldH,ball.r+2,H-ball.r-2);}
      clearTrail();snapRope();draw(performance.now());if(followTarget)resumeFollow();else if(!ball.sleeping)wake();
    }
    function layoutChanged() {
      if(disposed||layoutRAF)return;
      layoutRAF=requestAnimationFrame(()=>{
        layoutRAF=0;measureSurfaces();if(homeFlight&&!dragging)stepHomeFlight(performance.now());
        if(!following&&anchoredToAvatar&&ball.sleeping){if(ring){const p=avatarPosition();ball.x=p.x;ball.y=p.y;}else anchoredToAvatar=false;}
        if(!following&&rest&&rest.type==='year'&&ball.sleeping){
          const platform=platforms.find(p=>p.header===rest.header&&ball.x>p.left+ball.r+5&&ball.x<p.right-ball.r-5&&safeLanding(ball.x,p.y-ball.r));
          if(platform)ball.y=platform.y-ball.r;else{rest=null;ball.sleeping=false;ball.vy=30;wake();}
        }
        ball.x=clamp(ball.x,ball.r+2,W-ball.r-2);ball.y=clamp(ball.y,ball.r+2,H-ball.r-2);draw(performance.now());
      });
    }
    function hitYear(platform,speed,now) {
      if(speed<85||now-lastYearHit<800)return;
      lastYearHit=now;platform.header.classList.add('hit');
      clearTimeout(hitTimers.get(platform.header));hitTimers.set(platform.header,setTimeout(()=>{platform.header.classList.remove('hit');hitTimers.delete(platform.header);},850));
      if(!reduced.matches)pulses.push({x:ball.x,y:platform.y,t:now});
      illuminate();sound(speed);say(platform.year+' · 落在这一年的边线上。');
    }
    function avatarCollision() {
      if(!ring)return;
      let dx=ball.x-ring.x,dy=ball.y-ring.y,distance=Math.hypot(dx,dy),limit=ring.r+ball.r+1;
      if(distance>=limit)return;
      if(distance<.001){dx=1;dy=0;distance=1;}
      const nx=dx/distance,ny=dy/distance;ball.x=ring.x+nx*limit;ball.y=ring.y+ny*limit;
      const normalSpeed=ball.vx*nx+ball.vy*ny;
      if(normalSpeed<0){ball.vx-=1.68*normalSpeed*nx;ball.vy-=1.68*normalSpeed*ny;ball.spin+=(-ball.vx*ny+ball.vy*nx)*.005;sound(Math.abs(normalSpeed));}
    }
    function frame(now) {
      raf=0;if(disposed)return;
      const dt=Math.min(.032,Math.max(.001,(now-lastFrame)/1000||.016));lastFrame=now;
      const homeControlled=stepHomeFlight(now);
      if(homeControlled){}else if(!dragging&&following&&followTarget&&!ball.sleeping&&!reduced.matches){
        const target=boundedFollowPoint(),followRadius=ball.r,step=dt/3,stiffness=18.5*18.5,damping=2*.84*18.5;
        const oldX=ball.x,oldY=ball.y;
        for(let j=0;j<3;j++){
          ball.vx+=((target.x-ball.x)*stiffness-ball.vx*damping)*step;
          ball.vy+=((target.y-ball.y)*stiffness-ball.vy*damping)*step;
          ball.x=clamp(ball.x+ball.vx*step,followRadius+2,W-followRadius-2);
          ball.y=clamp(ball.y+ball.vy*step,followRadius+2,H-followRadius-2);
        }
        turn(-(ball.y-oldY)/ball.r,(ball.x-oldX)/ball.r,0,1);ball.spin=0;
        if(Math.hypot(target.x-ball.x,target.y-ball.y)<.85&&Math.hypot(ball.vx,ball.vy)<14){
          ball.x=target.x;ball.y=target.y;ball.vx=ball.vy=0;ball.sleeping=true;notifyFollowArrival(now);
        }
      } else if(!dragging&&!ball.sleeping&&!reduced.matches){
        const step=dt/3;let supported=false;
        for(let j=0;j<3;j++){
          const previousY=ball.y;ball.vy+=920*step;ball.x+=ball.vx*step;ball.y+=ball.vy*step;
          if(ball.x<ball.r+2){ball.x=ball.r+2;ball.vx=Math.abs(ball.vx)*.74;ball.spin+=.5;}
          if(ball.x>W-ball.r-2){ball.x=W-ball.r-2;ball.vx=-Math.abs(ball.vx)*.74;ball.spin-=.5;}
          if(ball.y<ball.r+2){ball.y=ball.r+2;ball.vy=Math.abs(ball.vy)*.62;}
          if(now>=highServeFlightUntil)avatarCollision();
          let grounded=false;
          if(ball.vy>=0){
            const hits=platforms.filter(p=>previousY+ball.r<=p.y+1&&ball.y+ball.r>=p.y&&ball.x>p.left+ball.r+6&&ball.x<p.right-ball.r-6&&safeLanding(ball.x,p.y-ball.r)).sort((a,b)=>a.y-b.y);
            if(hits.length){const p=hits[0],speed=ball.vy;ball.y=p.y-ball.r;ball.vy=speed<50?0:-speed*.59;ball.vx*=.82;ball.spin*=.76;rest={type:'year',header:p.header,year:p.year};grounded=ball.vy===0;hitYear(p,speed,now);}
          }
          if(ball.y>=H-ball.r-3){const speed=Math.abs(ball.vy);ball.y=H-ball.r-3;if(ball.vy>0){ball.vy=speed<50?0:-speed*.64;ball.vx*=.81;ball.spin*=.75;if(speed>95)sound(speed);}rest={type:'viewport'};grounded=ball.vy===0;}
          if(grounded)ball.vx*=Math.exp(-7*step);
          ball.vx*=Math.exp(-.13*step);
          supported=grounded;
        }
        turn(-ball.vy/ball.r*.45,ball.vx/ball.r*.7,ball.spin,dt);ball.spin*=Math.exp(-1.15*dt);
        if(!supported)rest=null;
        if(Math.abs(ball.vx)<2.2&&Math.abs(ball.vy)<3&&supported){ball.vx=ball.vy=ball.spin=0;ball.sleeping=true;}
      }
      stepRope(dt,now);pulses=pulses.filter(p=>now-p.t<500);
      draw(now);
      if(!raf&&((!ball.sleeping&&!dragging&&!reduced.matches)||ropeNeedsFrame()||trailNeedsFrame()||pulses.length||signatureBlendActive))raf=requestAnimationFrame(frame);
    }
    function wake() {if(disposed||raf)return;lastFrame=performance.now();raf=requestAnimationFrame(frame);}
    function notifyShot(vx,vy,origin) {if(typeof config.onShot==='function'){try{config.onShot({vx,vy,origin});}catch(_) {}}}
    function launch(vx,vy,message,origin) {
      cancelHomeRetry();homeServeArmed=false;userInteraction();
      if(origin!=='home-high'){highServeFlightUntil=0;homeFlight=null;}
      signatureDepthPending=true;
      anchoredToAvatar=false;rest=null;ball.vx=vx;ball.vy=vy;ball.spin=vx*.012;ball.sleeping=false;enableAudio();illuminate();
      if(message)say(message);
      notifyShot(vx,vy,origin||'throw');
      if(parked){draw(performance.now());return;}
      if(reduced.matches){ball.sleeping=true;ball.vx=ball.vy=0;draw(performance.now());return;}
      wake();
    }
    function serve() {
      if(disposed)return;
      if(homeFlight)return;
      if(homeContext()&&homeServeArmed&&serveHigh({source:'home-click'}))return;
      dragging=false;pointerId=null;button.style.cursor='grab';
      const direction=ball.x>W*.52?-1:1,home=homeContext();
      launch(home?280:direction*(260+(serveCount++%2)*70),home?-350:-590,'发一球。也可以拖动球，或用鼠标从旁轻轻挥过。','serve');
    }
    function firstQRect() {
      if(!watermark||!watermark.isConnected)return null;
      let found=null;
      function find(node,depth){
        if(found||!node||depth>8)return;
        if(node.nodeType===3){const index=node.textContent.indexOf('Q');if(index>=0)found={node,index};return;}
        for(const child of Array.from(node.childNodes||[]))find(child,depth+1);
      }
      find(watermark,0);
      if(found){try{const range=document.createRange();range.setStart(found.node,found.index);range.setEnd(found.node,found.index+1);const r=range.getBoundingClientRect();if(r.width>4&&r.height>4)return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}catch(_) {}}
      const r=watermark.getBoundingClientRect(),text=watermark.textContent.trim();
      if(!/^Q/.test(text)||r.width<8||r.height<8)return null;
      const style=getComputedStyle(watermark),font=[style.fontStyle||'normal',style.fontWeight||'400',style.fontSize,style.fontFamily].join(' '),probe=ballLayerContext||ctx;probe.save();probe.font=font;
      const full=probe.measureText(text).width,first=probe.measureText('Q').width;probe.restore();
      const width=r.width*(Number.isFinite(first)&&full>0?first/full:1/Math.max(1,text.length));
      return {left:r.left,top:r.top,right:r.left+width,bottom:r.bottom,width,height:r.height};
    }
    function qGlyphCavity(q) {
      if(!signature||!signature.data)return null;
      const {mask,data,left,top,width,height}=signature,sx=mask.width/width,sy=mask.height/height;
      const x0=clamp(Math.floor((q.left-q.width*.06-left)*sx),0,mask.width-1),x1=clamp(Math.ceil((q.right+q.width*.06-left)*sx),x0+1,mask.width);
      const y0=clamp(Math.floor((q.top-top)*sy),0,mask.height-1),y1=clamp(Math.ceil((q.bottom-top)*sy),y0+1,mask.height),w=x1-x0,h=y1-y0;
      if(w<8||h<8)return null;
      const ink=new Uint8Array(w*h),distance=new Float32Array(w*h),rowMin=new Int32Array(h).fill(w),rowMax=new Int32Array(h).fill(-1),colMin=new Int32Array(w).fill(h),colMax=new Int32Array(w).fill(-1);
      let minX=w,maxX=-1,minY=h,maxY=-1;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x,solid=data[((y+y0)*mask.width+x+x0)*4+3]>28;ink[i]=solid?1:0;distance[i]=solid?0:1e6;
        if(solid){rowMin[y]=Math.min(rowMin[y],x);rowMax[y]=Math.max(rowMax[y],x);colMin[x]=Math.min(colMin[x],y);colMax[x]=Math.max(colMax[x],y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      }
      if(maxX<0)return null;
      // A chamfer distance field locates clear space, while ink on all four sides identifies Q's counter.
      // This also tolerates small openings in a handwritten Q that a strict flood-fill would miss.
      const diagonal=Math.SQRT2;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let d=distance[i];if(x)d=Math.min(d,distance[i-1]+1);if(y)d=Math.min(d,distance[i-w]+1);if(x&&y)d=Math.min(d,distance[i-w-1]+diagonal);if(x<w-1&&y)d=Math.min(d,distance[i-w+1]+diagonal);distance[i]=d;}
      for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;let d=distance[i];if(x<w-1)d=Math.min(d,distance[i+1]+1);if(y<h-1)d=Math.min(d,distance[i+w]+1);if(x<w-1&&y<h-1)d=Math.min(d,distance[i+w+1]+diagonal);if(x&&y<h-1)d=Math.min(d,distance[i+w-1]+diagonal);distance[i]=d;}
      const candidates=[];let maximum=0;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const i=y*w+x;if(ink[i]||x<=rowMin[y]||x>=rowMax[y]||y<=colMin[x]||y>=colMax[x])continue;
        const vx=left+(x+x0+.5)/sx,vy=top+(y+y0+.5)/sy;
        if(vx<ball.r+5||vx>W-ball.r-5||vy<ball.r+10||vy>H-ball.r-12)continue;
        candidates.push(i);maximum=Math.max(maximum,distance[i]);
      }
      if(!candidates.length||maximum<3)return null;
      let centerX=0,centerY=0,weight=0;
      for(const i of candidates)if(distance[i]>=maximum*.82){const weightAt=distance[i]*distance[i];centerX+=(i%w)*weightAt;centerY+=Math.floor(i/w)*weightAt;weight+=weightAt;}
      centerX/=weight;centerY/=weight;let best=candidates[0],bestScore=Infinity;
      for(const i of candidates)if(distance[i]>=maximum*.90){const score=Math.hypot(i%w-centerX,Math.floor(i/w)-centerY);if(score<bestScore){bestScore=score;best=i;}}
      return {x:left+(best%w+x0+.5)/sx,y:top+(Math.floor(best/w)+y0+.5)/sy,radius:distance[best]/Math.max(sx,sy),method:'glyph-counter',ink:{left:left+(minX+x0)/sx,top:top+(minY+y0)/sy,right:left+(maxX+x0+1)/sx,bottom:top+(maxY+y0+1)/sy}};
    }
    function homeContext() {
      try { return !!config.isHomeView?.(); } catch (_) { return false; }
    }
    function cancelHomeRetry(){clearTimeout(homeRetryTimer);homeRetryTimer=0;homeRetryCount=0;}
    function fixedHomePoint(flight,t) {
      const u=clamp(t,0,flight.duration);
      return{x:flight.start.x+flight.vx*u,y:flight.start.y+flight.vy*u+flight.gravity*u*u/2,vx:flight.vx,vy:flight.vy+flight.gravity*u};
    }
    function stepHomeFlight(now) {
      if(!homeFlight||dragging)return false;
      if(parked||following||ropePin!==null||canvas.closest('dialog[open]')){homeFlight=null;highServeFlightUntil=0;return false;}
      const f=homeFlight,q=firstQRect();
      if(!q){homeFlight=null;highServeFlightUntil=0;return false;}
      const dx=q.left-f.q.left,dy=q.top-f.q.top;
      if(f.ink.bottom+dy<ball.r+5||f.ink.right+dx<0||f.ink.left+dx>W){homeFlight=null;highServeFlightUntil=0;ball.vy=Math.max(80,ball.vy);return false;}
      const cameraX=dx-f.cameraX,cameraY=dy-f.cameraY;
      if(Math.abs(cameraX)+Math.abs(cameraY)>.01){
        for(const p of trailHistory){p.x+=cameraX;p.y+=cameraY;}
        if(trailSample){trailSample.x+=cameraX;trailSample.y+=cameraY;}
        if(signaturePrevious){signaturePrevious.x+=cameraX;signaturePrevious.y+=cameraY;}
      }
      f.cameraX=dx;f.cameraY=dy;
      const t=(now-f.started)/1000,p=fixedHomePoint(f,t);
      ball.x=clamp(p.x+dx,ball.r+2,W-ball.r-2);ball.y=clamp(p.y+dy,ball.r+2,H-ball.r-2);
      ball.vx=p.vx;ball.vy=p.vy;ball.sleeping=false;
      turn(-ball.vy/ball.r*.45,ball.vx/ball.r*.7,0,.016);
      serveTarget.x=f.center.x+dx;serveTarget.y=f.center.y+dy;serveTarget.apexY=f.apexY+dy;
      serveTarget.progress=clamp(t/f.duration,0,1);serveTarget.phase=t<f.entryDuration?'through-counter':'exit-through-ink';
      serveTarget.q={...q};serveTarget.cavity={...f.center,x:f.center.x+dx,y:f.center.y+dy};
      serveTarget.ink={left:f.ink.left+dx,right:f.ink.right+dx,top:f.ink.top+dy,bottom:f.ink.bottom+dy};
      serveTarget.scrollOffsetX=dx;serveTarget.scrollOffsetY=dy;
      if(t>=f.duration){homeFlight=null;highServeFlightUntil=0;serveTarget.phase='complete';say('拖球自由抛接；归位后可重播穿 Q。',true);}
      return true;
    }
    function serveHigh(options) {
      const source=options?.source||'home-click';
      if(disposed||parked||dragging||following||ropePin!==null||canvas.closest('dialog[open]'))return false;
      if(homeFlight)return true;
      if(!homeServeArmed)return false;
      measureSurfaces();const q=firstQRect(),cavity=q&&qGlyphCavity(q);
      if(!q||!cavity){
        if(homeContext()&&homeRetryCount<20&&!homeRetryTimer){homeRetryCount++;homeRetryTimer=setTimeout(()=>{homeRetryTimer=0;if(!disposed&&homeContext())serveHigh({source});},70);}
        else if(homeRetryCount>=20){cancelHomeRetry();config.onHomeServeFailed?.();}
        return true;
      }
      clearTimeout(homeRetryTimer);homeRetryTimer=0;homeRetryCount=0;
      const now=performance.now(),start={x:ball.x,y:ball.y},center={x:cavity.x,y:cavity.y,radius:cavity.radius,method:cavity.method};
      // The portrait dock is left/below Q. A single gravity-driven arc crosses its counter while rising.
      if(center.x-start.x<20||start.y-center.y<20){homeServeArmed=false;return false;}
      const gravity=920,apexY=Math.max(cavity.ink.top+ball.r+7,center.y-Math.min(8,cavity.radius*.12));
      const vy=-Math.sqrt(2*gravity*(start.y-apexY));
      const crossing=(-vy-Math.sqrt(Math.max(0,2*gravity*(center.y-apexY))))/gravity;
      const vx=(center.x-start.x)/crossing,apexTime=-vy/gravity;
      const exitY=Math.min(H-ball.r-4,cavity.ink.bottom+ball.r*1.65);
      const exitTime=apexTime+Math.sqrt(Math.max(0,2*(exitY-apexY)/gravity));
      const duration=Math.min(exitTime,(W-ball.r-4-start.x)/vx),entryDuration=crossing;
      if(!(vx>0&&vy<0&&crossing>0&&duration>crossing))return false;
      userInteraction();clearFollow(true);homeServeArmed=false;anchoredToAvatar=false;rest=null;previousPointer=null;lastRacket=now;
      lastHighServe=now;highServeSource=source;highServeFlightUntil=now+(duration+.08)*1000;
      homeFlight={started:now,start,vx,vy,gravity,entryDuration,duration,q:{...q},ink:{...cavity.ink},center,direction:1,apexY,cameraX:0,cameraY:0};
      serveTarget={x:center.x,y:center.y,apexY,q:{...q},cavity:{...center},ink:{...cavity.ink},source,fixedPath:true,routeVersion:'q-right-up-parabola-v3',trajectory:'parabola',gravity,initialVelocity:{x:vx,y:vy},start:{...start},crossingTime:crossing,apexTime,duration:duration*1000,entryDuration,direction:1,progress:0,phase:'through-counter',scrollOffsetX:0,scrollOffsetY:0};
      clearTrail();ball.vx=ball.vy=0;ball.sleeping=false;signatureDepthPending=false;signatureBehind=true;enableAudio();illuminate();
      clearTimeout(glowTimer);glowTimer=setTimeout(()=>watermark?.classList.remove('is-struck'),(duration+.14)*1000);
      notifyShot(0,0,'home-high');
      if(reduced.matches){homeFlight=null;highServeFlightUntil=0;ball.sleeping=true;draw(now);return true;}
      say('这一拍，穿过 Q。',true);wake();return true;
    }
    function beginDrag(event) {
      if(event.button!==0)return;
      cancelHomeRetry();
      event.preventDefault();enableAudio();heldHomeFlight=homeFlight;homeHoldStarted=performance.now();if(!heldHomeFlight)highServeFlightUntil=0;dragging=true;pointerId=event.pointerId;ball.sleeping=true;ball.vx=ball.vy=0;rest=null;anchoredToAvatar=false;pointerSamples=[];
      const now=performance.now();dragOrigin={x:ball.x,y:ball.y,t:now};dragOffset={x:event.clientX-ball.x,y:event.clientY-ball.y};dragDistance=0;
      userInteraction();
      pointerSamples.push({x:ball.x,y:ball.y,t:now});button.style.cursor='grabbing';
      try{button.setPointerCapture(pointerId);}catch(_){}
      draw(now);
    }
    function moveDrag(event) {
      if(!dragging||event.pointerId!==pointerId)return;
      const now=performance.now(),x=clamp(event.clientX-dragOffset.x,ball.r+2,W-ball.r-2),y=clamp(event.clientY-dragOffset.y,ball.r+2,H-ball.r-2);
      dragDistance=Math.max(dragDistance,Math.hypot(x-dragOrigin.x,y-dragOrigin.y));
      if(dragDistance>=7){homeServeArmed=false;homeFlight=null;heldHomeFlight=null;highServeFlightUntil=0;}
      if(!reduced.matches)turn(-(y-ball.y)/ball.r,(x-ball.x)/ball.r,.008,1);
      ball.x=x;ball.y=y;pointerSamples.push({x,y,t:now});pointerSamples=pointerSamples.filter(p=>now-p.t<110);
      draw(now);
    }
    function endDrag(event,cancelled) {
      if(!dragging||event.pointerId!==pointerId)return;
      dragging=false;pointerId=null;button.style.cursor='grab';try{button.releasePointerCapture(event.pointerId);}catch(_){}
      const now=performance.now();pointerSamples=pointerSamples.filter(p=>now-p.t<110);pointerSamples.push({x:ball.x,y:ball.y,t:now});
      let vx=0,vy=0;const first=pointerSamples[0],last=pointerSamples[pointerSamples.length-1];
      if(!cancelled&&last.t>first.t+8){const seconds=(last.t-first.t)/1000;vx=clamp((last.x-first.x)/seconds,-1450,1450);vy=clamp((last.y-first.y)/seconds,-1450,1450);}
      const tapped=!cancelled&&dragDistance<7&&now-dragOrigin.t<600;
      if(tapped&&((homeContext()&&homeServeArmed)||heldHomeFlight)){
        pointerSamples=[];previousPointer=null;lastRacket=now;
        if(heldHomeFlight&&homeFlight===heldHomeFlight){const held=now-homeHoldStarted;homeFlight.started+=held;highServeFlightUntil+=held;heldHomeFlight=null;ball.sleeping=false;wake();return;}
        heldHomeFlight=null;if(serveHigh({source:'home-click'}))return;
      }
      homeFlight=null;heldHomeFlight=null;highServeFlightUntil=0;
      if(tapped){vy=-350;vx=homeContext()?240:ball.x>W*.5?-55:55;}
      pointerSamples=[];previousPointer=null;lastRacket=now;
      if(reduced.matches){userInteraction();ball.sleeping=true;illuminate();draw(now);say('已移动网球。减少动态模式已保留位置。');if(tapped)notifyShot(vx,vy,'tap');}
      else launch(vx,vy,cancelled?null:'这一拍，交给重力。',cancelled?'cancel':tapped?'tap':'throw');
    }
    function racket(event) {
      if(homeFlight||homeContext()){previousPointer=null;return;}
      if(event.pointerType!=='mouse'||dragging||reduced.matches||disposed){previousPointer=null;return;}
      const now=performance.now(),current={x:event.clientX,y:event.clientY,t:now},previous=previousPointer;previousPointer=current;
      if(!previous||now-previous.t>80||now-previous.t<4||now-lastRacket<800)return;
      const dx=current.x-previous.x,dy=current.y-previous.y,dt=(now-previous.t)/1000,length=Math.hypot(dx,dy),speed=length/dt;
      if(speed<780||length<3)return;
      const ratio=clamp(((ball.x-previous.x)*dx+(ball.y-previous.y)*dy)/(length*length),0,1);
      const distance=Math.hypot(ball.x-(previous.x+ratio*dx),ball.y-(previous.y+ratio*dy));
      if(distance>ball.r+15)return;
      lastRacket=now;
      const force=clamp(speed*.40,220,1050);
      launch(dx/length*force,Math.min(-110,dy/length*force-115),'挥拍命中。Q.Tang 也亮了一下。','racket');
    }
    canvas.style.pointerEvents='none';button.type='button';button.style.position='fixed';button.style.left='0';button.style.top='0';button.style.touchAction='none';button.style.cursor='grab';
    if(ropeCanvas)ropeCanvas.style.pointerEvents='none';
    if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label','网球。轻点跃起，拖动抛出。方向键移动，空格发球。');
    listen(button,'pointerdown',beginDrag);listen(button,'pointermove',moveDrag);listen(button,'pointerup',e=>endDrag(e,false));listen(button,'pointercancel',e=>endDrag(e,true));
    listen(button,'lostpointercapture',e=>{if(dragging&&e.pointerId===pointerId)endDrag(e,true);});
    listen(button,'keydown',event=>{
      if(event.key===' '||event.key==='Enter'){event.preventDefault();serve();return;}
      const moves={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};if(!moves[event.key])return;
      event.preventDefault();cancelHomeRetry();homeServeArmed=false;userInteraction();highServeFlightUntil=0;homeFlight=null;signatureDepthPending=true;anchoredToAvatar=false;rest=null;ball.sleeping=true;ball.vx=ball.vy=0;const v=moves[event.key];ball.x=clamp(ball.x+v[0],ball.r+2,W-ball.r-2);ball.y=clamp(ball.y+v[1],ball.r+2,H-ball.r-2);if(!reduced.matches)turn(0,v[0]/ball.r,0,1);draw(performance.now());
    });
    listen(config.serveButton,'click',serve);listen(config.resetButton,'click',()=>reset(true));
    listen(config.trailInput,'change',()=>{trailOn=config.trailInput.checked;clearTrail();if(!trailOn){rope=[];ropeSleeping=true;}else snapRope();draw(performance.now());});
    listen(config.soundButton,'click',()=>{soundOn=!soundOn;config.soundButton.setAttribute('aria-pressed',String(soundOn));config.soundButton.textContent=soundOn?'声音：开':'声音：关';enableAudio();if(soundOn)say('音效已打开，击地时轻响。',true);});
    if(config.soundButton){config.soundButton.setAttribute('aria-pressed','false');config.soundButton.textContent='声音：关';}
    listen(window,'pointermove',racket,{passive:true});listen(window,'resize',resize,{passive:true});listen(window,'scroll',layoutChanged,{passive:true,capture:true});
    if(watermark&&typeof MutationObserver!=='undefined'){
      const observer=new MutationObserver(layoutChanged);observer.observe(watermark,{attributes:true,attributeFilter:['style','class'],childList:true,characterData:true,subtree:true});removers.push(()=>observer.disconnect());
    }
    if(watermark&&typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(layoutChanged);observer.observe(watermark);removers.push(()=>observer.disconnect());
    }
    if(document.fonts){
      const fontsChanged=()=>{if(disposed)return;signatureRaster=null;layoutChanged();};
      listen(document.fonts,'loadingdone',fontsChanged);
      if(document.fonts.ready)document.fonts.ready.then(fontsChanged).catch(()=>{});
    }
    listen(reduced,'change',()=>{if(reduced.matches){highServeFlightUntil=0;homeFlight=null;ball.sleeping=true;ball.vx=ball.vy=0;pulses=[];if(raf){cancelAnimationFrame(raf);raf=0;}}clearTrail();snapRope();if(followTarget)resumeFollow();draw(performance.now());});
    listen(window,'blur',()=>{previousPointer=null;if(dragging){homeFlight=null;heldHomeFlight=null;highServeFlightUntil=0;cancelHomeRetry();dragging=false;pointerId=null;userInteraction();ball.sleeping=true;button.style.cursor='grab';draw(performance.now());}});
    function dispose() {
      if(disposed)return;disposed=true;clearTimeout(homeRetryTimer);heldHomeFlight=null;highServeFlightUntil=0;homeFlight=null;if(raf)cancelAnimationFrame(raf);if(layoutRAF)cancelAnimationFrame(layoutRAF);clearTimeout(glowTimer);clearFollowTimer();
      removers.forEach(fn=>fn());hitTimers.forEach((timer,el)=>{clearTimeout(timer);el.classList.remove('hit');});hitTimers.clear();
      if(watermark)watermark.classList.remove('is-struck');ctx.clearRect(0,0,W,H);if(ropeContext)ropeContext.clearRect(0,0,W,H);ballLayer.width=ballLayer.height=1;signature=null;signatureRaster=null;rope=[];ropePin=null;ropeSleeping=true;trailHistory=[];trailSample=null;if(audio)audio.close().catch(()=>{});delete canvas.__tennisHomeDispose;
    }
    const api={serve,serveHigh,reset:()=>reset(true),followTo,releaseFollow,parkAt,setRopePin,getRope,dispose,getState:()=>({x:ball.x,y:ball.y,r:ball.r,visualScale:1,vx:ball.vx,vy:ball.vy,sleeping:ball.sleeping,dragging,running:!!raf,following,parked,parkKey,lastHighServe,serveTarget:serveTarget?{...serveTarget,q:{...serveTarget.q},cavity:serveTarget.cavity?{...serveTarget.cavity}:null,ink:serveTarget.ink?{...serveTarget.ink}:null}:null,highServeSource,highServeActive:!!homeFlight,homeServeArmed,visualMode:visualMode(),trailPointCount:trailVisible()?trailHistory.length:0,ropeTail:ropeTailState().tail,ropeTangent:ropeTailState().tangent,ropePin:ropePin?{...ropePin}:null,ropeSleeping,ropePointCount:ropeVisible()?rope.length:0,occluded:signatureOcclusion>.012,behindSignature:signatureBehind&&signatureInside&&!dragging&&!parked,occlusionAmount:signatureOcclusion,signatureMaskReady:!!signature,signatureBounds:signature?{left:signature.left,top:signature.top,width:signature.width,height:signature.height}:null,followKey:followTarget?followTarget.key:null,followTarget:followTarget?{x:followTarget.x,y:followTarget.y}:null,followCooldownRemaining:Math.max(0,followBlockedUntil-performance.now()),platform:rest&&rest.type==='year'?rest.year:rest&&rest.type,trail:trailOn,sound:soundOn,reducedMotion:reduced.matches,width:W,height:H,yearPlatforms:platforms.length,avatarCircle:ring?{x:ring.x,y:ring.y,r:ring.r}:null})};
    canvas.__tennisHomeDispose=dispose;buildSphere();resize();return api;
  };
})();
