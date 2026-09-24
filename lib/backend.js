const MAX_BYTES = 2 * 1024 * 1024;
export function configuration(env = process.env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith('sb_publishable_')) return null;
  try { if (new URL(url).protocol !== 'https:') return null; } catch { return null; }
  return { url, key };
}
export function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status; res.end(JSON.stringify(body));
}
export function createConfigHandler({ env = process.env } = {}) {
  return (req, res) => {
    if (req.method !== 'GET') return send(res, 405, {error:'method_not_allowed'});
    const config = configuration(env);
    return send(res, 200, config ? {configured:true, supabaseUrl:config.url, supabasePublishableKey:config.key} : {configured:false});
  };
}
async function bodyOf(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('too_large');
    return JSON.parse(raw);
  }
  let size = 0; const chunks=[];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk); if (size > MAX_BYTES) throw new Error('too_large'); chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createSnapshotHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (!['GET','PUT'].includes(req.method)) return send(res,405,{error:'method_not_allowed'});
    const config = configuration(env);
    if (!config) return send(res,503,{error:'not_configured'});
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) return send(res,401,{error:'unauthorized'});
    const headers = {apikey:config.key, Authorization:authorization, 'Content-Type':'application/json'};
    const request = (path, options={}) => fetchImpl(config.url+path,{...options,headers,signal:AbortSignal.timeout(10000)});
    try {
      const userResponse = await request('/auth/v1/user');
      if (!userResponse.ok) return send(res,userResponse.status >= 500 ? 502 : 401,{error:userResponse.status >= 500 ? 'provider_unavailable' : 'unauthorized'});
      const user = await userResponse.json();
      if (!user.id) return send(res,401,{error:'unauthorized'});
      let response;
      if (req.method === 'GET') {
        response = await request('/rest/v1/cave_snapshots?select=snapshot,revision,updated_at&user_id=eq.'+encodeURIComponent(user.id));
      } else {
        let body;
        try { body = await bodyOf(req); } catch (error) { return send(res,error.message === 'too_large'?413:400,{error:error.message==='too_large'?'snapshot_too_large':'invalid_json'}); }
        if (!body || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || !body.snapshot || typeof body.snapshot !== 'object' || Array.isArray(body.snapshot)) return send(res,400,{error:'invalid_snapshot'});
        response = await request('/rest/v1/rpc/save_cave_snapshot',{method:'POST',body:JSON.stringify({p_snapshot:body.snapshot,p_expected_revision:body.expectedRevision})});
      }
      const data = await response.json();
      if (!response.ok) {
        if (data.code === '40001') return send(res,409,{error:'revision_conflict'});
        return send(res,response.status === 401 ? 401 : 502,{error:response.status === 401 ? 'unauthorized' : 'provider_unavailable'});
      }
      const row = Array.isArray(data) ? data[0] : data;
      return send(res,200,{snapshot:row?.snapshot ?? null,revision:row?.revision ?? 0,updatedAt:row?.updated_at ?? null});
    } catch { return send(res,502,{error:'provider_unavailable'}); }
  };
}
