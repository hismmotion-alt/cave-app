/* Persisted demo-state boundary. No network access and no automatic draft saving. */
(function(root){
  'use strict';
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const array=v=>Array.isArray(v)?v:[];
  const str=(v,f='')=>typeof v==='string'?v:f;
  const pick=(v,values,f)=>values.includes(v)?v:f;
  const num=(v,min,max,f)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
  const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:'1970-01-01T00:00:00.000Z';
  const id=v=>typeof v==='string'&&v.length>0&&v.length<=200?v:null;
  const unique=items=>{const seen=new Set();return items.filter(v=>v&&!seen.has(v.id)&&seen.add(v.id));};
  const companions=['maya','leo','alex'],vibes=['Cozy','Fresh','Futuristic','Calm'];
  function world(v,previous=false){if(!object(v)||!id(v.id))return null;const w={id:v.id,name:str(v.name,'My quiet room'),environment:pick(v.environment,['grotto','hearth','lounge','forest','ocean'],'lounge'),vibe:pick(v.vibe,vibes,'Calm'),prompt:str(v.prompt)};if(typeof v.mood==='string')w.mood=v.mood;if(companions.includes(v.companion))w.companion=v.companion;if(typeof v.role==='string')w.role=v.role;if(['alone','quiet','talk'].includes(v.presence))w.presence=v.presence;if(['Gentle','Reflective','Practical'].includes(v.style))w.style=v.style;if(!previous&&object(v.previous)){const p=world({...v.previous,id:v.id},true);if(p)w.previous=p}return w;}
  function paginate(text){const pages=[];let start=0;while(start<text.length){let end=Math.min(start+1100,text.length);if(end<text.length){const gap=text.lastIndexOf(' ',end);if(gap>start+700)end=gap+1}pages.push(text.slice(start,end));start=end}return pages;}
  function snapshot(v){return object(v)?{mood:pick(v.mood,['stressed','low','restless','okay'],null),musicTrack:pick(v.musicTrack,['warm','float','deep'],'warm'),musicVolume:num(v.musicVolume,0,1,.6)}:null;}
  function normalize(value){
    if(!object(value))throw new TypeError('Cave data must be an object.');
    const worlds=unique(array(value.worlds).map(v=>world(v))),worldIds=new Set(worlds.map(w=>w.id));
    const activeWorld=worldIds.has(value.activeWorld)?value.activeWorld:worlds[0]?.id||null;
    const books=unique(array(value.books).map(b=>{
      if(!object(b)||!id(b.id))return null;
      const validPages=Array.isArray(b.pages)&&b.pages.length>0&&b.pages.every(p=>typeof p==='string');
      const text=str(b.text,validPages?b.pages.join(''):'');
      const pages=validPages&&b.pages.join('')===text?b.pages:paginate(text);
      if(!pages.length)return null;
      const seen=new Set(),bookmarks=array(b.bookmarks).filter(m=>object(m)&&Number.isInteger(m.page)&&m.page>=0&&m.page<pages.length&&!seen.has(m.page)&&seen.add(m.page)).map(m=>({page:m.page,offset:pages.slice(0,m.page).join('').length})).sort((a,b)=>a.page-b.page);
      return {id:b.id,title:str(b.title,'Untitled book'),text,pages,page:Math.floor(num(b.page,0,pages.length-1,0)),font:num(b.font,16,26,18),theme:pick(b.theme,['cream','light','dark'],'cream'),roomIds:[...new Set((Array.isArray(b.roomIds)?b.roomIds:[activeWorld]).filter(r=>worldIds.has(r)))],bookmarks,sample:b.sample===true,created:date(b.created),lastRead:num(b.lastRead,0,Number.MAX_SAFE_INTEGER,0)};
    }));
    const notes=unique(array(value.notes).map(n=>!object(n)||!id(n.id)?null:{id:n.id,title:str(n.title,'A thought to keep'),text:str(n.text),roomId:worldIds.has(n.roomId)?n.roomId:null,room:str(n.room,'Your notebook'),created:date(n.created)}));
    const chats=unique(array(value.chats).map(c=>!object(c)||!id(c.id)?null:{id:c.id,created:date(c.created),title:str(c.title,'Evening reflection'),takeaway:str(c.takeaway),worldName:str(c.worldName),companionName:str(c.companionName),unsentDraft:str(c.unsentDraft),messages:array(c.messages).filter(m=>object(m)&&['user','ai'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:m.text,speakerName:str(m.speakerName,'AI companion'),worldName:str(m.worldName)}))}));
    return {worlds,activeWorld,books,notes,chats,profile:object(value.profile)?{name:str(value.profile.name,'Guest')}:null,loggedIn:value.loggedIn===true,sessionClosed:value.sessionClosed===true,style:pick(value.style,['Gentle','Reflective','Practical'],'Gentle'),reduced:value.reduced===true,selectedCompanion:pick(value.selectedCompanion,companions,'maya'),connectionRole:str(value.connectionRole,'Reflection partner'),presence:pick(value.presence,['alone','quiet','talk'],'alone'),musicMuted:value.musicMuted===true,musicTrack:pick(value.musicTrack,['warm','float','deep'],'warm'),musicVolume:num(value.musicVolume,0,1,.6),mood:pick(value.mood,['stressed','low','restless','okay'],null),moodOriginal:snapshot(value.moodOriginal),moodUndo:snapshot(value.moodUndo)};
  }
  const api={normalize};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.CaveState=api;
})(typeof window!=='undefined'?window:null);
