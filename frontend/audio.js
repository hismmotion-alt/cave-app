// Original, locally synthesized ambient score. No downloads or tracking.
(() => {
  let context, master, timer, unlocked=false, chord=0;let activeVoices=[];
  const chords=[[130.81,164.81,196,246.94],[110,130.81,164.81,196],[87.31,130.81,174.61,220],[98,146.83,196,246.94]];
  const sound='<path d="M11 5 6 9H3v6h3l5 4Z"/>';
  const waves='<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
  const slash='<path d="m16 9 5 6m0-6-5 6"/>';
  const eligible=()=>store.worlds.length>0 && !['welcome','login'].includes(screen);
  const wanted=()=>eligible() && !store.musicMuted && !document.hidden;
  function phrase(){
    if(!context || context.state!=='running' || !wanted())return;
    const now=context.currentTime;const track=store.musicTrack||'warm';const ratio=track==='float'?1.5:track==='deep'?.5:1;
    chords[chord++%chords.length].forEach((frequency,i)=>{
      const oscillator=context.createOscillator(), envelope=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency*ratio;
      envelope.gain.setValueAtTime(0,now);
      envelope.gain.linearRampToValueAtTime(.12,now+3+i*.15);
      envelope.gain.exponentialRampToValueAtTime(.001,now+15);
      oscillator.connect(envelope);envelope.connect(master);
      activeVoices.push({oscillator,envelope});oscillator.start(now);oscillator.stop(now+16);
      oscillator.onended=()=>{activeVoices=activeVoices.filter(v=>v.oscillator!==oscillator);oscillator.disconnect();envelope.disconnect()};
    });
  }
  function reconcile(){
    const play=wanted() && unlocked && context?.state==='running';
    if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(play?.16*(store.musicVolume??.6):0,context.currentTime,.12)}
    if(play && !timer){phrase();timer=setInterval(phrase,8000)}
    if(!play && timer){clearInterval(timer);timer=null}
    updateButton();
  }
  function updateButton(){
    const playing=!!(wanted() && unlocked && context?.state==='running');
    const label=playing?'Mute background music':store.musicMuted?'Unmute background music':'Play background music';
    document.querySelectorAll('[data-action="sound-toggle"]').forEach(button=>{
      button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(playing));
      button.innerHTML=button.classList.contains('sound-button')?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+sound+(playing?waves:slash)+'</svg>':playing?'Mute':'Play';
    });
    const state=document.querySelector('#sound-state');if(state)state.textContent=playing?((store.musicVolume??.6)===0?'Playing · volume 0':'Playing'):store.musicMuted?'Muted':'Paused';
  }

  function activate(){
    if(!wanted())return;
    try{
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio){toast('Background music is unavailable in this browser.');return}
        context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
        context.onstatechange=reconcile;
      }
      unlocked=true;
      context.resume().then(reconcile).catch(()=>{unlocked=false;updateButton()});
    }catch{unlocked=false;toast('Tap the sound icon to try playing music again.');updateButton()}
  }
  function sync(){
    const status=document.querySelector('.status');
    if(eligible() && status && !status.querySelector('[data-action="sound-toggle"]')){
      status.removeAttribute('aria-hidden');status.classList.add('music-toolbar');
      status.innerHTML='<span class="toolbar-brand">CAVE</span><div class="sound-toolbar-actions">'+(screen==='music'?'':'<button class="text-button" data-action="music-menu" aria-label="Sound settings">Sound</button>')+'<button class="icon-button sound-button" data-action="sound-toggle" aria-label="Play background music"></button></div>';
    }
    if(!eligible() && context?.state==='running')context.suspend().catch(()=>{});
    reconcile();
  }
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-action="sound-toggle"]');
    if(toggle){
      const isPlaying=wanted() && unlocked && context?.state==='running';
      store.musicMuted=!!isPlaying;persist();
      if(store.musicMuted)reconcile();else activate();
      return;
    }
    // Runs after app actions, so Enter my world and demo login unlock audio.
    if(eligible())activate();else sync();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){reconcile();context?.suspend().catch(()=>{})}
    else if(unlocked)activate();
  });
  window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;context?.suspend().catch(()=>{})});
  function changeTrack(){if(context){const now=context.currentTime;activeVoices.forEach(({oscillator,envelope})=>{envelope.gain.cancelScheduledValues(now);envelope.gain.setTargetAtTime(0,now,.12);try{oscillator.stop(now+.6)}catch{}})}clearInterval(timer);timer=null;chord=0;reconcile()}window.ambientMusic={sync,changeTrack};sync();
})();
