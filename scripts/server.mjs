import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import config from '../api/config.js';
import snapshot from '../api/snapshot.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const frontend=path.join(root,'public');
try {await stat(frontend);} catch {throw Error('Run npm run build first.');}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/config') return config(req,res);
  if(pathname==='/api/snapshot') return snapshot(req,res);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try {
    const file=path.resolve(frontend,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(frontend+path.sep)) throw Error('path');
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Cave: http://localhost:'+(Number(process.env.PORT)||3000)));
