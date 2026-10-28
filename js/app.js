import {read} from './database.js';
import {importBatch} from './importer.js';
import {suggestSystem} from './systems.js';
const files = document.querySelector('#files');
async function refresh() {
  const games = await read('Games');
  const list = document.querySelector('#games');list.replaceChildren();
  for (const game of games) {const row=document.createElement('li');row.textContent=game.title;list.append(row);}
}
files.onchange = async () => {
  const result = await importBatch(Array.from(files.files, file => ({file,system:suggestSystem(file.name)})), (index,total,name,message) => document.querySelector('#status').textContent=name+': '+message);
  document.querySelector('#status').textContent=JSON.stringify(result);await refresh();
};
refresh().catch(error => document.querySelector('#status').textContent=error.message);
