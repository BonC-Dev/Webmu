import {read,write} from './database.js';
import {contentHash,validateMetadata,validateFile,maxFileSize} from './importer.js';
export const maxBackupSize = 96 * 1024 * 1024;
function encode(bytes) {
  let text='';
  for(let index=0;index<bytes.length;index+=8192)text+=String.fromCharCode(...bytes.subarray(index,index+8192));
  return btoa(text);
}
function decode(text,limit) {
  if(typeof text!=='string'||text.length>Math.ceil(limit/3)*4+4)throw Error('A backup file exceeds its size limit.');
  let binary;try{binary=atob(text);}catch{throw Error('A backup file has invalid binary encoding.');}
  if(binary.length>limit)throw Error('A backup file exceeds its size limit.');
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}
export function validateBackup(backup) {
  if(!backup||backup.format!=='webmu'||backup.formatVersion!==1||!['metadata','full'].includes(backup.kind)||!Number.isFinite(Date.parse(backup.exportedAt)))throw Error('Use a Webmu version 1 metadata or full backup.');
  if(!Array.isArray(backup.gameMetadata)||backup.gameMetadata.length>500||!Array.isArray(backup.fileManifest)||backup.fileManifest.length>500||!Array.isArray(backup.covers)||backup.covers.length>500)throw Error('The backup structure is invalid or contains more than 500 games.');
  const ids=new Set(),hashes=new Set();
  for(const game of backup.gameMetadata){validateMetadata(game);if(ids.has(game.id)||hashes.has(game.fileId))throw Error('The backup contains repeated game identifiers or files.');ids.add(game.id);hashes.add(game.fileId);}
  const fileIds=new Set();
  for(const file of backup.fileManifest){if(!file||!hashes.has(file.id)||fileIds.has(file.id)||typeof file.name!=='string'||!file.name||file.name.length>255||!Number.isInteger(file.size)||file.size<=0||file.size>maxFileSize)throw Error('The file manifest is invalid.');fileIds.add(file.id);if(backup.kind==='full'&&typeof file.content!=='string')throw Error('A full backup is missing game bytes.');}
  if(backup.kind==='full'&&fileIds.size!==hashes.size)throw Error('A full backup is missing a game file.');
  const coverIds=new Set();
  for(const cover of backup.covers){if(!cover||!ids.has(cover.id)||coverIds.has(cover.id)||!['image/png','image/jpeg','image/webp'].includes(cover.type)||typeof cover.content!=='string')throw Error('The cover manifest is invalid.');coverIds.add(cover.id);}
  return backup;
}
export async function exportBackup(full) {
  const games=await read('Games');games.forEach(validateMetadata);
  const backup={format:'webmu',formatVersion:1,exportedAt:new Date().toISOString(),kind:full?'full':'metadata',gameMetadata:games,fileManifest:[],covers:[]};
  let size=0;
  for(const game of games){const file=await read('Files',game.fileId);if(!file?.blob){if(full)throw Error('The file for “'+game.title+'” is missing. A full backup cannot be completed.');continue;}size+=file.blob.size;if(full&&size>64*1024*1024)throw Error('Split libraries over 64 MB before making a full JSON backup.');const entry={id:file.id,name:file.name,size:file.blob.size};if(full)entry.content=encode(new Uint8Array(await file.blob.arrayBuffer()));backup.fileManifest.push(entry);}
  if(full)for(const cover of await read('Covers')){if(!games.some(game=>game.id===cover.id))continue;size+=cover.blob.size;if(size>64*1024*1024)throw Error('The full backup exceeds the 64 MB binary limit.');backup.covers.push({id:cover.id,type:cover.blob.type,content:encode(new Uint8Array(await cover.blob.arrayBuffer()))});}
  const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});if(blob.size>maxBackupSize)throw Error('The backup exceeds 96 MB.');return blob;
}
export async function prepareBackup(backup) {
  validateBackup(backup);const files=new Map(),covers=new Map();
  if(backup.kind==='full')for(const file of backup.fileManifest){const bytes=decode(file.content,maxFileSize);if(bytes.length!==file.size||await contentHash(bytes)!==file.id)throw Error('The content hash does not match “'+file.name+'”.');const game=backup.gameMetadata.find(game=>game.fileId===file.id);validateFile(file.name,bytes.buffer,game.system);files.set(file.id,{id:file.id,name:file.name,size:file.size,blob:new Blob([bytes])});}
  for(const cover of backup.covers){const bytes=decode(cover.content,2*1024*1024);const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';if(!({ 'image/png':png,'image/jpeg':jpg,'image/webp':webp }[cover.type]))throw Error('A cover has invalid image bytes.');covers.set(cover.id,new Blob([bytes],{type:cover.type}));}
  return {backup,files,covers};
}
export async function restoreBackup(prepared,report=()=>{}) {
  const {backup,files,covers}=prepared;const result={restored:0,duplicates:0,missing:0,failed:0};
  const existing=await read('Games'),hashes=new Set(existing.map(game=>game.fileId)),ids=new Set(existing.map(game=>game.id));
  for(const original of backup.gameMetadata){
    if(hashes.has(original.fileId)){result.duplicates++;continue;}
    try{const file=files.get(original.fileId)||await read('Files',original.fileId);if(!file?.blob){result.missing++;continue;}const game={...original,id:ids.has(original.id)?crypto.randomUUID():original.id};const records=[{store:'Games',value:game},{store:'Files',value:file}];if(covers.has(original.id))records.push({store:'Covers',value:{id:game.id,blob:covers.get(original.id)}});await write(records);hashes.add(game.fileId);ids.add(game.id);result.restored++;}
    catch(error){result.failed++;report(original.title+': '+error.message);}
  }
  return result;
}
