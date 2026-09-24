import {cp,mkdir,access,readdir} from 'node:fs/promises';
const target=new URL('../public/',import.meta.url);
const bundled=new URL('../frontend/',import.meta.url);
let source=new URL('../../evening-lounge/',import.meta.url);
try {await access(source);}catch{source=bundled;}
await mkdir(target,{recursive:true});await mkdir(bundled,{recursive:true});
for(const entry of await readdir(source,{withFileTypes:true})){
 if(!entry.isFile()||! /\.(html|js|css|png|jpg|jpeg|webp|svg|woff2?)$/i.test(entry.name))continue;
 await cp(new URL(entry.name,source),new URL(entry.name,target));
 if(source.href!==bundled.href)await cp(new URL(entry.name,source),new URL(entry.name,bundled));
}
await cp(new URL('../client/',import.meta.url),target,{recursive:true});
console.log('Built public frontend; frontend/ holds deployable source assets.');
