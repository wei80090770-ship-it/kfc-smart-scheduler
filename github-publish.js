/* GitHub Pages deployable draft/publish workflow. Supabase Auth + RLS required. */
(()=>{
let rosterBusy=false, rosterNotice='', rosterPublished=false;
const say=s=>{rosterNotice=s;const n=document.getElementById('roster-message');if(n)n.textContent=s;};
const dateRange=()=>({start:weekStart(state.date),end:plus(weekStart(state.date),6)});
async function loadRosters(){
 if(!dbToken||!dbCenter)return say('請先至系統設定登入 Supabase');
 if(rosterBusy)return;rosterBusy=true;
 try{
  const {start,end}=dateRange();
  const [rows,pubs]=await Promise.all([
   dbRequest('/rest/v1/scheduler_daily_rosters?select=center_id,work_date,group_code,rows&center_id=eq.'+encodeURIComponent(dbCenter)+'&work_date=gte.'+start+'&work_date=lte.'+end+'&limit=1000'),
   dbRequest('/rest/v1/scheduler_published_weeks?select=week_start&center_id=eq.'+encodeURIComponent(dbCenter)+'&week_start=eq.'+start)
  ]);
  for(const g of groups)for(let i=0;i<7;i++)delete state.assigned[key(g,plus(start,i))];
  for(const r of rows){if(!groups.includes(r.group_code))continue;state.assigned[key(r.group_code,r.work_date)]=Array.isArray(r.rows)?r.rows:[];}
  rosterPublished=pubs.length>0;save();render();say('已載入 '+rows.length+' 組每日班表'+(rosterPublished?'；本週已發布（唯讀）':'；本週草稿'));
 }catch(e){say('讀取班表失敗：'+e.message)}finally{rosterBusy=false}
}
async function saveRosters(){
 if(!dbToken||!dbCenter)return say('請先登入 Supabase，禁止把本機班表當正式資料');
 if(rosterPublished)return say('本週已發布，不能直接覆寫');
 if(rosterBusy)return;rosterBusy=true;
 try{
  const {start,end}=dateRange();
  const published=await dbRequest('/rest/v1/scheduler_published_weeks?select=week_start&center_id=eq.'+encodeURIComponent(dbCenter)+'&week_start=eq.'+start);
  if(published.length){rosterPublished=true;throw Error('本週已發布，禁止覆寫');}
  const data=[];for(let i=0;i<7;i++){const d=plus(start,i);for(const g of groups){
   const rows=(state.assigned||{})[key(g,d)]||[];
   data.push({center_id:dbCenter,work_date:d,group_code:g,rows:rows.map(r=>({employee:r.employee||'',cells:Array.isArray(r.cells)?r.cells.slice(0,times.length):[]})),updated_by:dbProfile.user_id});
  }}
  await dbRequest('/rest/v1/scheduler_daily_rosters?on_conflict=center_id,work_date,group_code',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(data)});
  say('本週 '+start+'～'+end+' 已儲存 '+data.length+' 組 Group／日期草稿至 Supabase');
 }catch(e){say('儲存失敗：'+e.message)}finally{rosterBusy=false}
}
async function publishRosters(){
 if(!dbToken||!dbCenter)return say('請先登入 Supabase');
 if(!confirm('確認已完成所有 Group 排班，並發布本週？發布後不能直接修改。'))return;
 await saveRosters();if(rosterBusy||!rosterNotice.includes('已儲存')||rosterPublished)return;
 try{await dbRequest('/rest/v1/rpc/scheduler_publish_week',{method:'POST',body:JSON.stringify({p_center:dbCenter,p_week_start:weekStart(state.date)})});rosterPublished=true;render();say('本週已正式發布至 Supabase')}catch(e){say('發布失敗：'+e.message)}
}
window.schedulerLoadWeek=loadRosters;window.schedulerSaveWeek=saveRosters;window.schedulerPublishWeek=publishRosters;
const priorGroup=groupPage;
groupPage=function(){return `<section class="panel"><div class="toolbar"><button onclick="schedulerLoadWeek()">讀取本週班表</button><button class="primary" onclick="schedulerSaveWeek()">儲存本週草稿</button><button onclick="schedulerPublishWeek()">正式發布本週</button><span class="tag">${rosterPublished?'本週已發布':'草稿／尚未發布'}</span></div><p id="roster-message" class="muted">${esc(rosterNotice)}</p></section>`+priorGroup()};
const priorWeek=weekPage;
weekPage=function(){return `<section class="panel"><div class="toolbar"><button onclick="schedulerLoadWeek()">讀取本週班表</button><button class="primary" onclick="schedulerSaveWeek()">儲存本週草稿</button><button onclick="schedulerPublishWeek()">正式發布本週</button></div><p id="roster-message" class="muted">${esc(rosterNotice)}</p></section>`+priorWeek()};
const originalEdit=edit;
edit=function(fn){if(rosterPublished&&['group','week'].includes(state.tab)){alert('本週已發布，不能直接編輯');return;}return originalEdit(fn)};
const oldSetDate=setDate;
setDate=function(d){rosterPublished=false;oldSetDate(d);if(dbToken&&dbCenter)loadRosters()};
const oldDbLoad=dbLoad;
dbLoad=async function(){await oldDbLoad();if(dbToken&&dbCenter)await loadRosters()};
render();
})();
