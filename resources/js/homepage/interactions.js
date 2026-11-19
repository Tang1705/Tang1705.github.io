(function(){
 async function start(){
  const status=document.getElementById('tennis-status');if(!status||window.tennisHomeDemo)return;
  await window.homepageDataReady;
  document.getElementById('currentYear').textContent=new Date().getFullYear();
  const typed=document.getElementById('typed'),typedWords=['Qi Tang','Ph.D. student @NJU','Living in Nanjing'],typingMotion=matchMedia('(prefers-reduced-motion: reduce)');let typedWord=0,typedCount=typedWords[0].length,erasing=true,typedTimer=0;
  typed.closest('h1').setAttribute('aria-label','Hi, I am Qi Tang. Ph.D. student at NJU. Living in Nanjing.');
  function typeNext(){clearTimeout(typedTimer);if(document.hidden||typingMotion.matches)return;const word=typedWords[typedWord];typedCount+=erasing?-1:1;typed.textContent=word.slice(0,Math.max(0,typedCount));let delay=erasing?45:90;if(typedCount<=0){typedWord=(typedWord+1)%typedWords.length;typedCount=0;erasing=false;delay=150;}else if(typedCount===word.length&&!erasing){erasing=true;delay=700;}typedTimer=setTimeout(typeNext,delay);}
  if(!typingMotion.matches)typedTimer=setTimeout(typeNext,700);document.addEventListener('visibilitychange',()=>{clearTimeout(typedTimer);if(!document.hidden&&!typingMotion.matches)typedTimer=setTimeout(typeNext,100);});typingMotion.addEventListener('change',()=>{clearTimeout(typedTimer);if(typingMotion.matches)typed.textContent=typedWords[0];else{typedWord=0;typedCount=typedWords[0].length;erasing=true;typedTimer=setTimeout(typeNext,700);}});window.homeTypedAnimation={getState:()=>({word:typedWords[typedWord],text:typed.textContent,reduced:typingMotion.matches})};
  const groups=[...document.querySelectorAll('.publication-group')],buttons=[...document.querySelectorAll('.filter-btn')],items=[...document.querySelectorAll('.publication-item')];
  const layout=document.querySelector('.pub-reading-layout'),preview=document.getElementById('reading-preview'),photoSpace=document.querySelector('.paper-photo-space'),cards=[...preview.querySelectorAll('.hanging-paper')],hangers=[...preview.querySelectorAll('.paper-hanger')],serve=document.getElementById('tennis-serve');document.body.append(preview);
  const ropeExtension=document.createElement('span');ropeExtension.className='paper-hanger paper-rope-extension';ropeExtension.setAttribute('aria-hidden','true');ropeExtension.hidden=true;preview.append(ropeExtension);
  let activeNode=null,reading=false,imageToken=0,scanFrame=0,nodeTimer=0,candidate=null,landingTimer=0,scrollLockUntil=0,viewer=null,footerDocked=false,hangFrame=0,hoveredPhoto=false,photoNodes=[],photoMetrics=null,homeScrollFired=false,lastHomeScrollY=window.scrollY,touchScrollStart=null,homeIntentFrame=0;
  const mediaCache=new Map(),mediaReady=new Set();
  const resolveMedia=value=>value?new URL(value,document.baseURI).href:'';
  const nodes=items.map((el,index)=>({el,index,key:el.dataset.nodeKey,title:el.dataset.title,venue:el.dataset.venue,year:el.dataset.year,paper:el.dataset.paper,media:resolveMedia(el.dataset.preview),fullMedia:resolveMedia(el.dataset.fullPreview),label:el.dataset.previewLabel}));
  function prefetch(src){if(!src)return Promise.resolve(false);if(mediaCache.has(src))return mediaCache.get(src);const result=new Promise(resolve=>{const image=new Image();image.onload=()=>{mediaReady.add(src);resolve(true);};image.onerror=()=>resolve(false);image.src=src;});mediaCache.set(src,result);return result;}
  function showNode(node){
   const token=++imageToken;preview.dataset.nodeKey=node.key;preview.dataset.media=node.media||'';
   const list=available(),at=list.findIndex(n=>n.key===node.key),first=Math.max(0,Math.min(at-1,Math.max(0,list.length-3)));photoNodes=at<0?[]:list.slice(first,first+3);
   cards.forEach((card,i)=>{const n=photoNodes[i],img=card.querySelector('img'),hasCover=!!n?.media;card.hidden=!hasCover;hangers[i].hidden=true;card.classList.remove('is-ready');card.classList.toggle('is-current',n?.key===node.key);img.onload=null;img.onerror=null;if(!n){delete card.dataset.nodeKey;delete card.dataset.articleIndex;img.removeAttribute('src');return;}card.dataset.nodeKey=n.key;card.dataset.articleIndex=String(n.index);card.title=n.title;card.setAttribute('aria-label','查看论文首页：'+n.title);img.alt=n.title+' · 论文首页';if(!hasCover){img.removeAttribute('src');return;}img.onload=()=>{if(token===imageToken&&card.dataset.nodeKey===n.key){card.classList.add('is-ready');queueHanging();}};img.onerror=()=>{if(token===imageToken&&card.dataset.nodeKey===n.key){card.hidden=true;hangers[i].hidden=true;card.classList.remove('is-ready');queueHanging();}};img.src=n.media;if(img.complete&&img.naturalWidth)card.classList.add('is-ready');});queueHanging();
  }
  function available(){return nodes.filter(node=>!node.el.hidden&&!node.el.closest('.publication-group').hidden&&node.el.getClientRects().length);}
  function queueHanging(){if(!hangFrame)hangFrame=requestAnimationFrame(positionHanging);}
  function positionHanging(){
   hangFrame=0;ropeExtension.hidden=true;if(!api||!reading||viewer?.isOpen()){cards.forEach(c=>c.hidden=true);hangers.forEach(h=>h.hidden=true);return;}const rope=api.getRope(),state=api.getState(),m=photoMetrics;if(!m||state.visualMode!=='rope'||rope.length<2){cards.forEach(c=>c.hidden=true);hangers.forEach(h=>h.hidden=true);return;}
   const currentSlot=photoNodes.findIndex(n=>n.key===activeNode?.key),placements=[],slots=Math.max(1,photoNodes.length),mobileWidth=Math.min(70,(m.maxX-m.minX-12*(slots-1))/slots);
   const wireX=Math.max(m.minX+12,Math.min(m.maxX-12,m.maxX-28));
   cards.forEach((card,i)=>{
    const n=photoNodes[i],img=card.querySelector('img'),article=n?.el.getBoundingClientRect();
    if(!n?.media||n.el.hidden||n.el.closest('.publication-group').hidden||img.complete&&!img.naturalWidth||!m.mobile&&(article.bottom<=8||article.top>=innerHeight-16)){card.hidden=true;hangers[i].hidden=true;return;}
    const isCurrent=n.key===activeNode?.key,distance=Math.abs(i-currentSlot),w=m.mobile?mobileWidth:Math.min(m.width*(isCurrent?1:distance>1?.8:.86),isCurrent?120:distance>1?98:104,article.height*(isCurrent?.76:.68),Math.max(48,m.maxX-m.minX-12));
    const height=img.naturalWidth?(w-10)*img.naturalHeight/img.naturalWidth+10:w*1.414+10;
    const left=m.mobile?m.minX+(slots===1?(m.maxX-m.minX-w)/2:i*(m.maxX-m.minX-w)/(slots-1)):Math.max(m.minX,Math.min(m.maxX-w,m.maxX-w-10));
    // Desktop photos follow their own article, not the active article's rope sample or the viewport clamp.
    const top=m.mobile?m.top+34:article.top+(article.height-height)/2;
    if(!m.mobile&&(top+height<8||top>innerHeight-16)){card.hidden=true;hangers[i].hidden=true;return;}
    const peg=Math.max(10,Math.min(w-10,(m.mobile?left+w*.52:wireX)-left));
    placements.push({card,i,n,left,top,w,height,peg,x:left+peg,articleCenter:article.top+article.height/2});
   });
   const lowest=rope.reduce((best,p)=>p.y>best.y?p:best,rope[0]),lastPeg=placements.reduce((y,p)=>Math.max(y,p.top),lowest.y);
   const extensionEnd=!m.mobile&&lastPeg>lowest.y+3?{x:wireX,y:lastPeg}:null;
   function lineBetween(line,a,b){line.hidden=false;line.style.left=a.x+'px';line.style.top=a.y+'px';line.style.width=Math.hypot(b.x-a.x,b.y-a.y)+'px';line.style.transform='rotate('+Math.atan2(b.y-a.y,b.x-a.x)+'rad)';}
   if(extensionEnd)lineBetween(ropeExtension,lowest,extensionEnd);
   function pointForY(y){
    if(extensionEnd&&y>=lowest.y){const t=Math.max(0,Math.min(1,(y-lowest.y)/(extensionEnd.y-lowest.y||1)));return{x:lowest.x+(extensionEnd.x-lowest.x)*t,y:lowest.y+(extensionEnd.y-lowest.y)*t,tangent:{x:extensionEnd.x-lowest.x,y:extensionEnd.y-lowest.y}};}
    let best=null,score=Infinity;
    for(let i=0;i<rope.length-1;i++){const a=rope[i],b=rope[i+1],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y||1))),p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},d=Math.abs(p.y-y)+Math.abs(p.x-wireX)*.015;if(d<score){score=d;best={...p,tangent:{x:b.x-a.x,y:b.y-a.y}};}}
    return best;
   }
   placements.forEach(p=>{
    const {card,i,n,left,top,w,peg}=p;let point;
    if(m.mobile){const at=Math.min(rope.length-2,Math.floor((1-(i+.5)/slots)*(rope.length-1)));point={...rope[at],tangent:{x:rope[at+1].x-rope[at].x,y:rope[at+1].y-rope[at].y}};}else point=pointForY(top);
    const tangent=(m.mobile?Math.atan2(point.tangent.y,Math.abs(point.tangent.x)||1):Math.atan2(point.tangent.x,Math.abs(point.tangent.y)||1))*180/Math.PI,seed=[-4,3,-2,4,-3,2][n.index%6],rotation=hoveredPhoto&&card.dataset.angle?Number(card.dataset.angle):seed+Math.max(-1.5,Math.min(1.5,tangent*.04));
    const radians=rotation*Math.PI/180,alignedTop=m.mobile?top:p.articleCenter-((w/2-peg)*Math.sin(radians)+p.height/2*Math.cos(radians));
    card.hidden=false;card.classList.toggle('is-current',n.key===activeNode?.key);card.style.width=w+'px';card.style.left=left+'px';card.style.top=alignedTop+'px';card.style.transformOrigin=peg+'px 0px';card.style.setProperty('--peg-x',peg+'px');card.style.transform='rotate('+rotation+'deg)';card.dataset.angle=rotation.toFixed(2);card.dataset.articleTop=n.el.getBoundingClientRect().top.toFixed(2);
    lineBetween(hangers[i],point,{x:p.x,y:alignedTop});
   });if(state.running||state.dragging||!state.ropeSleeping)hangFrame=requestAnimationFrame(positionHanging);
  }
  function targetFor(node){
   const r=node.el.getBoundingClientRect();
   if(innerWidth<=700){const bar=photoSpace.getBoundingClientRect();photoMetrics={mobile:true,minX:bar.left+5,maxX:bar.right-5,top:bar.top,width:82};api?.setRopePin({x:bar.left+15,y:bar.top+12});queueHanging();return{x:bar.right-26,y:bar.top+31,key:node.key};}
   photoMetrics={mobile:false,minX:innerWidth>=1320?12:layout.getBoundingClientRect().left+6,maxX:r.left-24,width:Math.min(136,r.left-42),top:78};api?.setRopePin({x:Math.max(54,r.left-58),y:Math.max(74,innerHeight*.075)});queueHanging();return {x:Math.max(31,r.left-36),y:Math.max(120,Math.min(innerHeight-80,r.top+Math.min(r.height*.4,70))),key:node.key};
  }
  let api;
  function inHomeView(){if(!api||reading||footerDocked||viewer?.isOpen()||window.scrollY>Math.min(260,innerHeight*.28))return false;const r=document.getElementById('monument-name').getBoundingClientRect();return r.bottom>70&&r.top<innerHeight*.7;}
  function highServeFromScroll(){if(homeScrollFired||homeIntentFrame||!inHomeView())return;homeIntentFrame=requestAnimationFrame(()=>{homeIntentFrame=requestAnimationFrame(()=>{homeIntentFrame=0;if(homeScrollFired||!inHomeView())return;const b=api.getState();if(!b.homeServeArmed||b.dragging||b.parked||b.following||!b.sleeping)return;if(api.serveHigh({source:'home-scroll'}))homeScrollFired=true;});});}
  function activate(node){
   if(!node)return;const changed=activeNode?.key!==node.key;activeNode=node;
   items.forEach(el=>el.dataset.reading=String(el===node.el));
   if(changed){showNode(node);status.textContent='向右挥拍：下一篇 · 向左：上一篇 · 拖球可自由发球';}
   api?.followTo(targetFor(node));
   const list=available(),at=list.indexOf(node);serve.textContent=list.length<2?'发一球 ↗':at===list.length-1?'回到首篇 ↗':'下一拍 ↗';
  }
  function stepNode(direction){if(!reading||!activeNode)return;const list=available();if(list.length<2)return;const at=list.indexOf(activeNode),next=list[direction<0?Math.max(0,at-1):(at+1)%list.length];clearTimeout(nodeTimer);candidate=next;scrollLockUntil=performance.now()+1100;activate(next);next.el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
  function scan(){
   scanFrame=0;if(viewer?.isOpen())return;const bounds=layout.getBoundingClientRect(),inside=bounds.top<innerHeight*.48&&bounds.bottom>innerHeight*.35;
   if(!inside){if(reading){reading=false;activeNode=null;candidate=null;hoveredPhoto=false;clearTimeout(nodeTimer);items.forEach(el=>el.dataset.reading='false');api?.releaseFollow();api?.setRopePin(null);cards.forEach(c=>c.hidden=true);hangers.forEach(h=>h.hidden=true);ropeExtension.hidden=true;serve.textContent='发一球 ↗';}const signature=document.getElementById('footer-signature');if(signature){const r=signature.getBoundingClientRect();if(r.top>40&&r.bottom<innerHeight-5){const credit=document.querySelector('.footer-credit')?.getBoundingClientRect();api?.followTo({x:Math.max(35,(credit?.left??r.left)-42),y:r.top+r.height/2,key:'footer-signature'});footerDocked=true;}else if(footerDocked){api?.releaseFollow();footerDocked=false;}}return;}
   footerDocked=false;
   reading=true;const list=available();if(!list.length)return;
   if(performance.now()<scrollLockUntil&&activeNode){api?.followTo(targetFor(activeNode));return;}
   const line=innerHeight*.55;let nearest=list[0],best=Infinity;
   for(const node of list){const rect=node.el.getBoundingClientRect(),d=Math.abs(rect.top+rect.height*.45-line);if(d<best){best=d;nearest=node;}}
   if(activeNode?.key===nearest.key){api?.followTo(targetFor(nearest));return;}
   if(candidate?.key!==nearest.key){candidate=nearest;clearTimeout(nodeTimer);nodeTimer=setTimeout(()=>{if(reading&&candidate){activate(candidate);}},95);}
  }
  function schedule(){if(!scanFrame)scanFrame=requestAnimationFrame(scan);}
  buttons.forEach(button=>button.addEventListener('click',()=>{
   const filter=button.dataset.filter;buttons.forEach(b=>b.classList.toggle('active',b===button));
   groups.forEach(group=>{let n=0;group.querySelectorAll('.publication-item').forEach(item=>{const show=filter==='all'||item.dataset.category===filter||(filter==='CCF-A'&&item.dataset.category==='CCF-T1');item.hidden=!show;if(show)n++;});group.hidden=!n;});
   clearTimeout(nodeTimer);candidate=null;activeNode=null;photoNodes=[];cards.forEach(c=>c.hidden=true);hangers.forEach(h=>h.hidden=true);ropeExtension.hidden=true;scrollLockUntil=0;schedule();
  }));
  document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');if(!h.startsWith('mailto:')&&!h.startsWith('#')&&new URL(h,document.baseURI).origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}});
  try{
   api=window.initTennisHome({canvas:document.getElementById('tennis-canvas'),ropeCanvas:document.getElementById('tennis-rope-canvas'),button:document.getElementById('tennis-ball'),serveButton:null,resetButton:document.getElementById('tennis-reset'),trailInput:document.getElementById('tennis-trail'),soundButton:document.getElementById('tennis-sound'),status,watermark:document.getElementById('monument-name'),avatar:document.querySelector('.profile .portrait .spinner'),isHomeView:inHomeView,onReset:()=>{homeScrollFired=false;},onHomeServeFailed:()=>{homeScrollFired=false;},onShot:shot=>{queueHanging();if(viewer?.isOpen()){viewer.handleShot(shot);return;}if(shot.origin==='home-high'){homeScrollFired=true;return;}if(hoveredPhoto)return;if(shot.origin==='serve'||shot.origin==='tap')stepNode(1);else if(shot.origin==='racket')stepNode(shot.vx>=0?1:-1);},onImpact:key=>{if(activeNode?.key!==key)return;queueHanging();preview.classList.add('is-landed');clearTimeout(landingTimer);landingTimer=setTimeout(()=>preview.classList.remove('is-landed'),600);}});
   window.tennisHomeDemo=api;status.textContent='网球已就绪 · 拖动、轻点，或从旁快速挥拍';
   viewer=window.initPersonalViewer({api,status,photos:window.homepageData?.photos||[],getActiveNode:()=>activeNode,onPauseReading:()=>{clearTimeout(nodeTimer);candidate=null;scrollLockUntil=0;hoveredPhoto=false;api.setRopePin(null);queueHanging();},onResumeReading:()=>{if(activeNode&&reading)activate(activeNode);else api.reset();schedule();}});window.personalViewer=viewer;
   serve.addEventListener('click',()=>{hideMenu();api.serve();});
  }catch(error){status.textContent='网球暂未启动：'+error.message;console.error(error);}
  cards.forEach(card=>{card.addEventListener('pointerenter',()=>hoveredPhoto=true);card.addEventListener('pointerleave',()=>{hoveredPhoto=false;queueHanging();});card.addEventListener('click',event=>{const node=nodes.find(n=>n.key===card.dataset.nodeKey);if(node)viewer?.openPaper({...node,media:node.fullMedia||node.media},event.currentTarget);});});
  document.getElementById('tennis-trail').addEventListener('change',queueHanging);document.getElementById('tennis-ball').addEventListener('pointerdown',queueHanging);window.addEventListener('pointermove',()=>{if(reading&&api?.getState().dragging)queueHanging();},{passive:true});
  function personalEntry(selector,kind){document.querySelectorAll(selector).forEach(entry=>entry.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();hideMenu();if(kind==='photo')viewer?.openPhotography(entry);else viewer?.openMusic(entry);}));}
  personalEntry('.contacts a[href*="photography.vipixel.net"],[data-personal-room="photo"]','photo');personalEntry('.contacts a[href*="music.vipixel.net"],[data-personal-room="music"]','music');
  const menu=document.getElementById('tennis-controls'),launcher=document.getElementById('tennis-launch'),ballButton=document.getElementById('tennis-ball');let longPress=0,pressPoint=null,menuOrigin=launcher;
  function hideMenu(){const wasOpen=!menu.hidden;menu.hidden=true;launcher.setAttribute('aria-expanded','false');if(wasOpen&&menuOrigin?.isConnected)menuOrigin.focus({preventScroll:true});}
  function showMenu(anchor){if(viewer?.isOpen())return;menuOrigin=anchor;const rect=anchor.getBoundingClientRect();menu.hidden=false;const w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(10,Math.min(innerWidth-w-10,rect.left+rect.width/2))+'px';menu.style.top=Math.max(10,Math.min(innerHeight-h-12,rect.bottom+9))+'px';launcher.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus({preventScroll:true});}
  launcher.addEventListener('click',()=>{if(menu.hidden)showMenu(launcher);else hideMenu();});document.getElementById('tennis-menu-close').addEventListener('click',hideMenu);document.getElementById('tennis-reset').addEventListener('click',()=>{hideMenu();homeScrollFired=false;queueHanging();});
  ballButton.addEventListener('contextmenu',event=>{event.preventDefault();showMenu(ballButton);});ballButton.addEventListener('pointerdown',event=>{pressPoint={x:event.clientX,y:event.clientY};clearTimeout(longPress);if(!viewer?.isOpen())longPress=setTimeout(()=>showMenu(ballButton),760);});
  ballButton.addEventListener('pointermove',event=>{if(pressPoint&&Math.hypot(event.clientX-pressPoint.x,event.clientY-pressPoint.y)>8)clearTimeout(longPress);});for(const type of ['pointerup','pointercancel'])ballButton.addEventListener(type,()=>{clearTimeout(longPress);pressPoint=null;});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('#tennis-controls,#tennis-launch,#tennis-ball'))hideMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape')hideMenu();});window.addEventListener('scroll',hideMenu,{passive:true});
  let statusTimer=0,lastStatus=status.textContent;function briefly(){const text=status.textContent;if(text===lastStatus)return;lastStatus=text;status.classList.add('is-visible');clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.classList.remove('is-visible'),2600);}
  new MutationObserver(briefly).observe(status,{childList:true,characterData:true,subtree:true});try{if(!sessionStorage.getItem('vipixel-tennis-hint-v13')){sessionStorage.setItem('vipixel-tennis-hint-v13','1');status.textContent='首页点球或下滑，向右上穿过 Q；归位可重播。';}}catch(_){}
  let pending=0;const name=document.getElementById('monument-name');
  function parallax(){pending=0;const y=Math.min(window.scrollY,700);name.style.transform=`translateX(-50%) translateY(${y*.105}px) rotateX(${Math.min(y*.003,2)}deg)`;}
  window.addEventListener('scroll',()=>{const y=window.scrollY,dy=y-lastHomeScrollY;lastHomeScrollY=y;if(y<8&&dy<=0)homeScrollFired=false;if(dy>6)highServeFromScroll();if(!pending)pending=requestAnimationFrame(parallax);schedule();},{passive:true});window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('wheel',event=>{if(event.deltaY>0)highServeFromScroll();},{passive:true});window.addEventListener('touchstart',event=>{touchScrollStart=event.touches[0]?.clientY??null;},{passive:true});window.addEventListener('touchmove',event=>{const y=event.touches[0]?.clientY;if(touchScrollStart!=null&&y!=null&&touchScrollStart-y>14)highServeFromScroll();},{passive:true});
  const cancelScrollLock=()=>{scrollLockUntil=0;};window.addEventListener('wheel',cancelScrollLock,{passive:true});window.addEventListener('touchstart',cancelScrollLock,{passive:true});parallax();
  nodes.filter(n=>n.media).forEach(n=>prefetch(n.media));schedule();
  const focusTitle=new URLSearchParams(location.search).get('paper');if(focusTitle){try{history.scrollRestoration='manual';}catch(_){}const focus=nodes.find(n=>n.title.includes(focusTitle));if(focus)Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(resolve=>setTimeout(resolve,1200))]).then(()=>focus.el.scrollIntoView({behavior:'instant',block:'center'}));}
  window.publicationReading={getState:()=>({reading,activeKey:activeNode?.key,title:activeNode?.title,previewKey:preview.dataset.nodeKey,media:preview.dataset.media,kind:'论文首页',coverCount:nodes.filter(n=>n.media).length,photoKeys:photoNodes.map(n=>n.key),photoSlots:photoNodes.map(n=>({key:n.key,index:n.index,hasCover:!!n.media,current:n.key===activeNode?.key})),hangingAnimating:!!hangFrame,photos:cards.filter(c=>!c.hidden).map(c=>({key:c.dataset.nodeKey,index:Number(c.dataset.articleIndex),current:c.classList.contains('is-current'),top:Number.parseFloat(c.style.top),angle:c.dataset.angle,ready:c.classList.contains('is-ready')})),ball:api?.getState()}),activate:key=>{const node=nodes.find(n=>n.key===key);if(node){reading=true;activate(node);}}};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.homepageReady=start();},{once:true});else window.homepageReady=start();
})();
