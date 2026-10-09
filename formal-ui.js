/* Nine-page navigation, OP center switch and conservative compliance overview. */
(()=>{
 const names=[['overview','班表總覽'],['group','階梯排班'],['forecast','TC 需求預測'],['employees','員工管理'],['availability','員工指休'],['holidays','國定假日對照'],['analysis','人員工時統計'],['compliance','員工休假合規檢查'],['settings','系統設定']];
 tabs.splice(0,tabs.length,...names);
 const prevRender=render;
 window.schedulerAddCenterPicker=function(){
  document.getElementById('formal-center-select')?.remove();
  if(dbProfile?.role!=='op_admin'||!window.schedulerCenters?.length)return;
  const el=document.createElement('label');el.id='formal-center-select';el.style='display:inline-flex;align-items:center;gap:8px;background:#fff;color:#17223a;padding:6px;border-radius:8px';
  const txt=document.createElement('span');txt.textContent='OP 管理中心';el.append(txt);
  const sel=document.createElement('select');for(const c of window.schedulerCenters){const o=document.createElement('option');o.value=c.id;o.textContent=c.name||c.id;sel.append(o)}sel.value=dbCenter;
  sel.onchange=async()=>{const old=dbCenter;sel.disabled=true;try{dbCenter=sel.value;state.dbLoaded=false;state.employees=[];state.assigned={};state.historyTC=[];state.historyWindow=null;state.dbRestaurants=[];state.forecast={};render();await dbLoad();}catch(e){alert('切換中心失敗：'+e.message);dbCenter=old;await dbLoad().catch(()=>{});sel.value=old}finally{sel.disabled=false}};
  el.append(sel);document.querySelector('header')?.append(el);
 };
 function compliance(){
  if(!state.dbLoaded)return '<section class="panel"><h2>員工休假合規檢查</h2><p>請先登入並讀取正式資料。</p></section>';
  const start=weekStart(state.date),days=Array.from({length:7},(_,i)=>plus(start,i));let warnings=[];
  for(const e of state.employees){let total=0;let previousEnd=null;
   for(const d of days){let slots=[];for(const g of groups)for(const r of state.assigned[key(g,d)]||[])if(r.employee===e.id)r.cells.forEach((c,i)=>{if(c&&c!=='break')slots.push(i)});
    const distinct=new Set(slots);if(distinct.size!==slots.length)warnings.push([e.name,d,'跨 Group 同時段重疊']);
    const idx=[...distinct].sort((a,b)=>a-b);const hrs=idx.length*.5;total+=hrs;
    if(hrs>8)warnings.push([e.name,d,'當日排班超過 8 小時（待核實適用規則）']);
    let run=0,last=-2;for(const i of idx){run=i===last+1?run+1:1;if(run===9)warnings.push([e.name,d,'連續排班超過 4 小時，請檢查休息']);last=i}
    if(idx.length){const st=new Date(d+'T00:00:00').getTime()+idx[0]*30*60000+8*3600000;const end=new Date(d+'T00:00:00').getTime()+(idx[idx.length-1]+1)*30*60000+8*3600000;
     if(previousEnd!==null&&(st-previousEnd)/3600000<11)warnings.push([e.name,d,'距前次排班結束不足 11 小時']);previousEnd=end;}
   }
  }
  return `<section class="panel"><h2>員工休假合規檢查</h2>${datebar({week:true})}<div class="note">本頁僅對目前載入的瀏覽器班表做初步提醒；尚未涵蓋跨週休假、國定假日、所有勞基法例外及已發布班表，不可當成法遵核准。</div><div class="cards"><div class="card">目前員工<b>${state.employees.length}</b></div><div class="card">待確認提醒<b>${warnings.length}</b></div></div><div class="scroll"><table class="table"><thead><tr><th>員工</th><th>日期</th><th>待確認事項</th></tr></thead><tbody>${warnings.length?warnings.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="3">目前載入資料沒有觸發上述初步規則；不代表已完成法規驗證</td></tr>'}</tbody></table></div></section>`;
 }
 const originalSetTab=setTab;
 setTab=function(t){if(!names.some(x=>x[0]===t))t='overview';originalSetTab(t)};
 render=function(){if(!names.some(x=>x[0]===state.tab))state.tab='overview';if(state.tab==='compliance'){document.getElementById('nav').innerHTML=names.map(([id,name])=>`<button class="${state.tab===id?'active':''}" onclick="setTab('${id}')">${name}</button>`).join('');document.getElementById('app').innerHTML=compliance();return}prevRender();document.getElementById('nav').innerHTML=names.map(([id,name])=>`<button class="${state.tab===id?'active':''}" onclick="setTab('${id}')">${name}</button>`).join('')};
 // Remove misleading prototype labeling from the header and footer only; do not imply unverified features are complete.
 const h=document.querySelector('header h1');if(h)h.textContent='KFC 外送中心｜智慧排班';
 const foot=document.querySelector('.foot');if(foot)foot.textContent='班表發布、法規檢核及氣象自動更新尚未完成正式環境驗收；請勿將瀏覽器草稿視為正式發布班表。';
 render();
})();
