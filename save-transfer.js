// Save transfer — a separate classic script so it works even if the game script hits an error.
// ---- save transfer: an encrypted file that can be imported exactly once ----
document.addEventListener('DOMContentLoaded', function(){
  const KEY = 'TURTLE-PRK-7f3a';
  const xor = (bytes)=>{ const k = new TextEncoder().encode(KEY); return bytes.map((b, i)=> b ^ k[i % k.length] ^ (i * 31 & 255)); };
  const b64 = (u8)=>{ let s = ''; u8.forEach(b=> s += String.fromCharCode(b)); return btoa(s); };
  const unb64 = (str)=> Uint8Array.from(atob(str), c=> c.charCodeAt(0));
  const sum = (str)=>{ let h = 2166136261; for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const usedKey = 'prk_used_transfers';
  const slotKey = ()=> 'spin_save_slot_' + (Number(localStorage.getItem('spin_current_slot')) || 1) + '_v1';
  const exp = document.getElementById('save-export'), imp = document.getElementById('save-import');
  if(exp) exp.addEventListener('click', ()=>{
    try{ if(window.__prkSave) window.__prkSave(); }catch(e){}
    const raw = localStorage.getItem(slotKey());
    if(!raw){ alert('Нечего сохранять'); return; }
    const payload = JSON.stringify({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), data: raw });
    const body = b64(xor(new TextEncoder().encode(payload)));
    const blob = new Blob(['PRK1:' + sum(body) + ':' + body], { type:'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prokrutka_save_' + new Date().toISOString().slice(0, 10) + '.prk'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 30000);
  });
  if(imp) imp.addEventListener('change', async ()=>{
    const f = imp.files && imp.files[0]; imp.value = '';
    if(!f) return;
    try{
      const txt = (await f.text()).trim();
      const m = /^PRK1:([a-z0-9]+):(.+)$/s.exec(txt);
      if(!m || sum(m[2]) !== m[1]) throw new Error('bad');
      const obj = JSON.parse(new TextDecoder().decode(xor(unb64(m[2]))));
      JSON.parse(obj.data);
      let used = []; try{ used = JSON.parse(localStorage.getItem(usedKey) || '[]'); }catch(e){}
      if(used.includes(obj.id)){ alert('Это сохранение уже было загружено. Каждый файл работает один раз.'); return; }
      if(!confirm('Загрузить сохранение? Текущий слот будет заменён.')) return;
      used.push(obj.id); localStorage.setItem(usedKey, JSON.stringify(used));
      window._wipingProgress = true;
      localStorage.setItem('prk_pending_import', obj.data);
      localStorage.setItem(slotKey(), obj.data);
      location.reload();
    }catch(e){ alert('Файл повреждён или это не сохранение игры.'); }
  });
});
