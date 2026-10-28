import {read,write,removeGame} from './database.js';
import {importBatch,importFile,validateMetadata} from './importer.js';
import {systems,getSystem,suggestSystem} from './systems.js';
import {selectGames} from './library.js';
import {createPlayer} from './player.js';
import {examples} from './examples.js';
const $ = id => document.getElementById(id);
let games=[],view='all',entries=[],editing,returnFocus,locked=false;
const covers=new Map();
function say(message,error=false) {$('notice').hidden=false;$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function button(text,action,className='') {const element=document.createElement('button');element.textContent=text;element.className=className;element.onclick=action;return element;}
function busy(action) {return async event=>{if(locked)return;locked=true;const target=event?.currentTarget;if(target instanceof HTMLButtonElement)target.disabled=true;try{await action(event);}catch(error){say(error.message,true);}finally{locked=false;if(target instanceof HTMLButtonElement)target.disabled=false;}};}
async function refresh() {
  const records=await read('Games');games=[];let invalid=0;
  for(const record of records){try{validateMetadata(record);games.push(record);}catch{invalid++;}}
  for(const url of covers.values())URL.revokeObjectURL(url);covers.clear();
  for(const cover of await read('Covers'))if(cover.blob instanceof Blob && ['image/png','image/jpeg','image/webp'].includes(cover.blob.type))covers.set(cover.id,URL.createObjectURL(cover.blob));
  render();if(invalid)say(invalid+' invalid record(s) were left untouched. Export a backup before trying repairs.',true);
}
function render() {
  $('allCount').textContent=games.length;$('favoriteCount').textContent=games.filter(game=>game.favorite).length;
  const labels={all:'All games',favorites:'Favorites',recent:'Recently played'};
  $('heading').textContent=view==='all'?'Your game shelf.':labels[view];$('viewCrumb').textContent=labels[view];
  document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view);button.setAttribute('aria-pressed',String(button.dataset.view===view));});
  const selected=selectGames(games,{view,search:$('search').value,system:$('systemFilter').value,sort:$('sort').value});
  $('resultCount').textContent=selected.length+' '+(selected.length===1?'game':'games');$('games').replaceChildren();
  for(const game of selected) {
    const card=document.createElement('article');card.className='game-card';
    const art=document.createElement('div');art.className='cover-wrap';const image=document.createElement('img');image.src=covers.get(game.id)||'assets/covers/'+(examples.find(example=>example.title===game.title)?.cover || (game.system==='flash'?'color.svg':'meadow.svg'));image.alt='';image.className='cover';image.loading='lazy';art.append(image);
    const favorite=button(game.favorite?'♥':'♡',busy(async()=>{await write([{store:'Games',value:{...game,favorite:!game.favorite}}]);await refresh();}),'favorite');favorite.setAttribute('aria-label',(game.favorite?'Unfavorite ':'Favorite ')+game.title);favorite.setAttribute('aria-pressed',String(game.favorite));art.append(favorite);
    const badge=document.createElement('span');badge.className='system-chip';badge.textContent=getSystem(game.system).displayName;art.append(badge);
    const title=document.createElement('h3');title.textContent=game.title;const meta=document.createElement('p');meta.className='game-meta';meta.textContent=game.example?'INCLUDED EXAMPLE':(game.lastPlayed?'Played '+new Date(game.lastPlayed).toLocaleDateString():'Added '+new Date(game.addedAt).toLocaleDateString());
    const actions=document.createElement('div');actions.className='game-actions';actions.append(button('Play ↗',()=>launchGame(game),'play'),button('Edit',()=>editGame(game),'text-button'),button('Delete',busy(async()=>{if(confirm('Delete “'+game.title+'” and its local file? Other games will stay.')){await removeGame(game);await refresh();}}),'text-button'));
    card.append(art,meta,title,actions);$('games').append(card);
  }
  $('empty').hidden=selected.length>0;$('empty').querySelector('h2').textContent=games.length?'No games match this view':'Nothing on this shelf yet';$('empty').querySelector('p').textContent=games.length?'Try another search, system or collection.':'Import your files, or use the examples below to try the player.';
  $('examplesSection').hidden=games.length>0;
  for(const row of $('systemNav').children){row.querySelector('small').textContent=games.filter(game=>game.system===row.dataset.system).length;row.classList.toggle('selected',$('systemFilter').value===row.dataset.system);}
}
async function launchGame(game) {
  if(player.state!=='idle')return;returnFocus=document.activeElement;
  $('playerTitle').textContent=game.title;$('playerSystem').textContent=getSystem(game.system).displayName;$('playerControls').textContent=getSystem(game.system).controls;
  $('playerScreen').hidden=false;$('main').inert=true;document.querySelector('.sidebar').inert=true;$('exitPlayer').focus();await player.launch(game);
}
const player=createPlayer($('playerContainer'),(state,message)=>{
  $('playerStatus').textContent=message||({loading:'Loading the local engine…',running:'Click inside the game to use its controls.',error:'The game could not start.'}[state]||'');$('fullscreen').disabled=state!=='running';
  if(state==='idle'){$('playerScreen').hidden=true;$('main').inert=false;document.querySelector('.sidebar').inert=false;returnFocus?.focus();refresh().catch(error=>say(error.message,true));}
});
$('exitPlayer').onclick=()=>player.close();
$('fullscreen').onclick=()=>{$('playerScreen').requestFullscreen().catch(error=>say('Fullscreen did not open: '+error.message,true));};
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('playerScreen').hidden&&!document.fullscreenElement)player.close();});
function chooseFiles(files) {
  if(!files.length)return;if(files.length>50){say('Import up to 50 files at once.',true);return;}
  entries=Array.from(files,file=>({file,system:suggestSystem(file.name)}));$('importEntries').replaceChildren();$('importResults').replaceChildren();$('importProgress').textContent='';
  for(const entry of entries){const row=document.createElement('label');row.className='import-row';const name=document.createElement('span');name.textContent=entry.file.name+' · '+(entry.file.size/1024).toFixed(1)+' KB';const select=document.createElement('select');select.setAttribute('aria-label','System for '+entry.file.name);const empty=document.createElement('option');empty.value='';empty.textContent='Choose a system';select.append(empty);for(const system of systems){const option=document.createElement('option');option.value=system.id;option.textContent=system.displayName;select.append(option);}select.value=entry.system;select.onchange=()=>entry.system=select.value;row.append(name,select);$('importEntries').append(row);}
  $('importDialog').showModal();
}
for(const id of ['importNav','emptyImport','dropBrowse'])$(id).onclick=()=>$('files').click();
$('files').onchange=()=>{chooseFiles($('files').files);$('files').value='';};
for(const event of ['dragover','drop'])$('dropZone').addEventListener(event,e=>{e.preventDefault();if(event==='drop')chooseFiles(e.dataTransfer.files);});
window.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer.types).includes('Files'))event.preventDefault();});
window.addEventListener('drop',event=>{if(!$('dropZone').contains(event.target))event.preventDefault();});
$('importConfirm').onclick=busy(async()=>{
  $('importDialog').querySelectorAll('select,form button').forEach(control=>control.disabled=true);
  try {const result=await importBatch(entries,(index,total,name,message)=>{const row=document.createElement('p');row.textContent=name+': '+message;$('importResults').append(row);$('importProgress').textContent=index+' / '+total+' checked';});$('importProgress').textContent=result.imported+' imported, '+result.duplicates+' duplicates, '+result.failed+' failed.';await refresh();entries=[];}
  finally{$('importDialog').querySelectorAll('select,form button').forEach(control=>control.disabled=false);}
});
function editGame(game) {editing=game;$('editTitle').value=game.title;$('editNotes').value=game.notes||'';$('coverInput').value='';$('editError').textContent='';$('editDialog').showModal();}
$('editClose').onclick=()=>$('editDialog').close();
$('editForm').onsubmit=async event=>{
  event.preventDefault();const submit=$('editForm').querySelector('button.primary');if(submit.disabled)return;submit.disabled=true;
  try {const title=$('editTitle').value.trim();if(!title)throw Error('Give this game a title.');const records=[{store:'Games',value:{...editing,title,notes:$('editNotes').value.trim()}}];const file=$('coverInput').files[0];
    if(file){if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use a PNG, JPG or WebP image under 2 MB.');const bitmap=await createImageBitmap(file);if(bitmap.width>4096||bitmap.height>4096){bitmap.close();throw Error('Cover dimensions must be 4096 pixels or smaller.');}bitmap.close();records.push({store:'Covers',value:{id:editing.id,blob:file}});}
    await write(records);$('editDialog').close();await refresh();say('Changes saved.');
  }catch(error){$('editError').textContent=error.message;}finally{submit.disabled=false;}
};
for(const system of systems){const option=document.createElement('option');option.value=system.id;option.textContent=system.displayName;$('systemFilter').append(option);const row=button('',()=>{$('systemFilter').value=$('systemFilter').value===system.id?'':system.id;render();},'system-row');row.dataset.system=system.id;const name=document.createElement('span');name.textContent=system.displayName;const count=document.createElement('small');row.append(name,count);$('systemNav').append(row);const support=document.createElement('p');const strong=document.createElement('strong');strong.textContent=system.displayName+' · '+system.supportStatus;support.append(strong,document.createElement('br'),document.createTextNode(system.knownLimitations));$('supportList').append(support);}
for(const control of ['search','systemFilter','sort'])$(control).addEventListener(control==='search'?'input':'change',render);
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;render();});
async function addExample(example,play=false){const response=await fetch('assets/examples/'+encodeURIComponent(example.file));if(!response.ok)throw Error('The example file could not load.');const result=await importFile(new File([await response.blob()],example.file),example.system,true);await refresh();const game=result.game||games.find(game=>game.example&&game.title===example.title);if(play&&game)await launchGame(game);}
for(const example of examples){const card=document.createElement('article');card.className='game-card example-card';const image=document.createElement('img');image.className='cover';image.src='assets/covers/'+example.cover;image.alt='';const tag=document.createElement('p');tag.className='game-meta';tag.textContent=getSystem(example.system).displayName.toUpperCase()+' / ORIGINAL EXAMPLE';const title=document.createElement('h3');title.textContent=example.title;const description=document.createElement('p');description.className='example-description';description.textContent=example.description;card.append(image,tag,title,description,button('Try this example ↗',busy(()=>addExample(example,true)),'play'));$('examples').append(card);}
$('examplesButton').onclick=busy(async()=>{for(const example of examples)await addExample(example);say('Examples added. Pick one to try the player.');});
$('helpOpen').onclick=()=>$('helpDialog').showModal();
$('backupOpen').onclick=async()=>{$('backupDialog').showModal();const estimate=await navigator.storage?.estimate?.();$('storageUsage').textContent=estimate?'This origin uses about '+(estimate.usage/1048576).toFixed(1)+' MB of '+(estimate.quota/1073741824).toFixed(1)+' GB available.':'This browser does not report storage usage.';};
window.addEventListener('pagehide',()=>{player.close();for(const url of covers.values())URL.revokeObjectURL(url);});
refresh().catch(error=>say('The library could not open: '+error.message+'. Existing browser data was left alone.',true));
export {refresh};
