/* KFC scheduler: browser-side authenticated Supabase REST adapter. No secret key. */
const DB_URL='https://dttqrfofmlacdewwzhme.supabase.co';
const DB_KEY='sb_publishable_s2X20yOktFUD9uQ1JeMiwg_dWDNsv9j';
let dbToken=null, dbCenter=null, dbProfile=null, dbBusy=false;
const dbMessage=(msg)=>{const el=document.getElementById('db-message');if(el)el.textContent=msg;};
async function dbRequest(path,opts={}){
 const h={'apikey':DB_KEY,'Content-Type':'application/json',...(dbToken?{'Authorization':'Bearer '+dbToken}:{}),...(opts.headers||{})};
 const res=await fetch(DB_URL+path,{...opts,headers:h});const raw=await res.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!res.ok)throw Error((data?.message||data?.error_description||data?.hint||data?.error||'HTTP '+res.status)+' ['+res.status+']');return data;
}
async function dbLogin(){try{
 const email=document.getElementById('db-email').value.trim(),password=document.getElementById('db-password').value;
 if(!email||!password)throw Error('請輸入 Supabase Auth 帳號與密碼');dbMessage('登入中…');
 const result=await dbRequest('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 dbToken=result.access_token;document.getElementById('db-password').value='';
 const ps=await dbRequest('/rest/v1/profiles?select=user_id,display_name,role,center_id,active&user_id=eq.'+encodeURIComponent(result.user.id)+'&limit=1');
 if(!ps?.[0]?.active)throw Error('登入成功，但找不到啟用的 profiles 權限');dbProfile=ps[0];
 dbMessage('已登入：'+(dbProfile.display_name||email)+'／'+dbProfile.role);await dbLoad();
 }catch(e){dbMessage('登入／讀取失敗：'+e.message)} }
function dbLogout(){dbToken=null;dbCenter=null;dbProfile=null;dbMessage('已登出');render()}
function dbPanel(){return `<section class="panel"><h2>Supabase 正式資料連線</h2><div class="note">僅使用 Publishable Key 與 Auth 登入。現有 DMS、餐廳及班表只讀取；員工與指休需要先執行隨附的資料庫升級 SQL 並確認 RLS。</div><div class="toolbar"><input id="db-email" type="email" placeholder="Supabase Auth Email" autocomplete="username"><input id="db-password" type="password" placeholder="密碼" autocomplete="current-password"><button class="primary" onclick="dbLogin()">登入並載入</button><button onclick="dbLoad()" ${dbToken?'':'disabled'}>重新同步</button><button onclick="dbLogout()">登出</button></div><p id="db-message" class="muted">${dbProfile?'已登入：'+esc(dbProfile.display_name||dbProfile.role):'尚未登入；不會使用示範資料冒充正式資料'}</p><p class="muted">登入後以帳號所屬中心為準；正式同步資料會顯示在員工管理、員工指休及歷史 TC 頁面。</p></section>`}
async function dbLoad(){if(!dbToken||dbBusy)return;dbBusy=true;try{
 dbMessage('正在讀取中心、餐廳、員工及歷史 TC…');
 const centers=await dbRequest('/rest/v1/centers?select=id,name,active&active=eq.true');
 dbCenter=dbProfile.center_id||centers[0]?.id;if(!dbCenter)throw Error('找不到可使用的中心');
 const qs='center_id=eq.'+encodeURIComponent(dbCenter);
 const [dbRestaurants,employees,regular,exceptions,historical,supportGroups]=await Promise.all([
 dbRequest('/rest/v1/restaurants?select=id,center_id,region_code,restaurant_name,active&'+qs+'&active=eq.true&limit=2000'),
 dbRequest('/rest/v1/scheduler_employees?select=id,center_id,employee_code,employee_name,group_code,min_shift_hours,active&'+qs+'&active=eq.true&limit=2000'),
 dbRequest('/rest/v1/scheduler_regular_availability?select=employee_id,weekday,window_no,start_time,end_time&limit=5000'),
 dbRequest('/rest/v1/scheduler_weekly_exceptions?select=employee_id,work_date,exception_type,windows&limit=5000'),
 dbRequest('/rest/v1/dms_30m?select=center_id,restaurant_id,business_date,bucket_time,own_tc&'+qs+'&order=business_date.desc&limit=1000'),
 dbRequest('/rest/v1/scheduler_employee_support_groups?select=employee_id,group_code&limit=5000')
 ]);
 const validGroups=[...new Set(dbRestaurants.map(r=>r.region_code).filter(Boolean))].sort();
 if(validGroups.length){groups.splice(0,groups.length,...validGroups);for(const k of Object.keys(restaurants))delete restaurants[k];for(const g of groups)restaurants[g]=dbRestaurants.filter(r=>r.region_code===g).map(r=>r.restaurant_name);state.group=groups.includes(state.group)?state.group:groups[0]}
 const next=employees.map(e=>({id:e.employee_code,name:e.employee_name,group:e.group_code,start:5,end:14,min:Number(e.min_shift_hours),dbId:e.id,support:supportGroups.filter(s=>s.employee_id===e.id).map(s=>s.group_code)}));
 state.employees=next;state.regularWeekly={};for(const e of next){const a=Array.from({length:7},()=>null);for(const r of regular.filter(x=>x.employee_id===e.dbId)){let i=r.weekday-1;if(i>=0&&i<7){a[i]??=[];a[i].push([r.start_time.slice(0,5),r.end_time.slice(0,5)])}}state.regularWeekly[e.id]=a}
 state.exceptions={};for(const e of next){const days={};for(const x of exceptions.filter(x=>x.employee_id===e.dbId))days[x.work_date]={type:x.exception_type,windows:x.windows};for(const [date,v] of Object.entries(days)){let w=weekStart(date),k=e.id+'|'+w;state.exceptions[k]??={days:{}};state.exceptions[k].days[date]=v}}
 // Convert DMS rows to existing historical TC structure; no synthetic predictions.
 const idMap=new Map(dbRestaurants.map(r=>[String(r.id),r]));state.historyTC=historical.filter(x=>idMap.has(String(x.restaurant_id))).map(x=>{const r=idMap.get(String(x.restaurant_id));return {date:x.business_date,group:r.region_code,restaurant:r.restaurant_name,time:x.bucket_time.slice(0,5),own_tc:x.own_tc,activity:'',baseline:''}});
 state.dbRestaurants=dbRestaurants;state.dbLoaded=true;state.dbCenter=dbCenter;state.dbStats={employees:next.length,restaurants:dbRestaurants.length,history:state.historyTC.length};save();render();dbMessage('正式資料載入：員工 '+next.length+'、餐廳 '+dbRestaurants.length+'、歷史 TC '+state.historyTC.length+' 筆（最近 1000 筆 DMS，尚非完整歷史）');
 }catch(e){dbMessage('資料讀取失敗：'+e.message+'。請確認 SQL、Auth 及各表 RLS。')}finally{dbBusy=false}}
async function dbAddEmployee(){if(!dbToken||!dbCenter)return alert('請先登入並載入 Supabase');const code=document.getElementById('new-employee-code')?.value.trim(),name=document.getElementById('new-employee-name')?.value.trim(),group=document.getElementById('new-employee-group')?.value;if(!code||!name||!group)return alert('請填寫員工編號、姓名、Group');try{await dbRequest('/rest/v1/scheduler_employees',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({center_id:dbCenter,employee_code:code,employee_name:name,group_code:group})});await dbLoad();setTab('employees')}catch(e){alert('新增失敗：'+e.message)}}
async function dbSaveRegular(id,idx,field,value){const e=getEmployee(id);if(!e?.dbId)return alert('請先載入正式員工資料');let a=state.regularWeekly?.[id]?.[idx]||null;let updated=a?JSON.parse(JSON.stringify(a)):null;if(field==='off')updated=value?null:[['08:00','12:00']];else{updated??=[['08:00','12:00']];updated[0][field==='start'?0:1]=value}try{
 await dbRequest('/rest/v1/scheduler_regular_availability?employee_id=eq.'+e.dbId+'&weekday=eq.'+(idx+1),{method:'DELETE'});
 if(updated?.length)await dbRequest('/rest/v1/scheduler_regular_availability',{method:'POST',body:JSON.stringify(updated.map((w,i)=>({employee_id:e.dbId,weekday:idx+1,window_no:i+1,start_time:w[0],end_time:w[1]})))});
 v77SetRegular(id,idx,field,value);
 }catch(err){alert('固定時段儲存失敗：'+err.message)}}
async function dbSaveExceptions(){if(!dbToken)return alert('請先登入');if(avLocked(avWeekStart()))return alert('已超過週一 18:00 截止時間');const errors=avValidate();if(errors.length)return alert(errors.join('；'));const e=getEmployee(avEmployee);if(!e?.dbId)return alert('員工資料尚未同步');try{
 for(let i=0;i<7;i++){const d=plus(avWeekStart(),i),v=avDayValue(d);await dbRequest('/rest/v1/scheduler_weekly_exceptions?employee_id=eq.'+e.dbId+'&work_date=eq.'+d,{method:'DELETE'});if(v.type!=='same')await dbRequest('/rest/v1/scheduler_weekly_exceptions',{method:'POST',body:JSON.stringify({employee_id:e.dbId,work_date:d,exception_type:v.type,windows:v.windows||[]})})}
 oldAvSave();alert('本週指休已同步至 Supabase');
 }catch(err){alert('指休同步失敗：'+err.message+'；請重新載入核對，避免部分日期已更新')}}
// Preserve original V8.3 page logic; extend only selected pages.
const originalSettings=v73settings;v73settings=function(){return dbPanel()+originalSettings()};
const originalEmployees=employeesPage;employeesPage=function(){const g=groups.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');return `<section class="panel"><h2>新增員工</h2><div class="toolbar"><input id="new-employee-code" placeholder="員工編號"><input id="new-employee-name" placeholder="姓名"><select id="new-employee-group">${g}</select><button class="primary" onclick="dbAddEmployee()">＋ 新增員工（Supabase）</button></div><p class="muted">員工資料以 Supabase 為準；請先在系統設定登入。</p></section>`+originalEmployees()};
// Existing regular controls are intercepted and saved to DB instead of local-only.
const oldSetRegular=v77SetRegular;v77SetRegular=function(id,idx,field,value){if(dbToken){dbSaveRegular(id,idx,field,value);return}oldSetRegular(id,idx,field,value)};
// prevent recursive callback after DB persistence
const safeSetRegular=oldSetRegular;dbSaveRegular=async function(id,idx,field,value){const e=getEmployee(id);if(!e?.dbId)return alert('請先載入正式員工資料');let a=state.regularWeekly?.[id]?.[idx]||null;let updated=a?JSON.parse(JSON.stringify(a)):null;if(field==='off')updated=value?null:[['08:00','12:00']];else{updated??=[['08:00','12:00']];updated[0][field==='start'?0:1]=value}try{await dbRequest('/rest/v1/scheduler_regular_availability?employee_id=eq.'+e.dbId+'&weekday=eq.'+(idx+1),{method:'DELETE'});if(updated?.length)await dbRequest('/rest/v1/scheduler_regular_availability',{method:'POST',body:JSON.stringify(updated.map((w,i)=>({employee_id:e.dbId,weekday:idx+1,window_no:i+1,start_time:w[0],end_time:w[1]})))});safeSetRegular(id,idx,field,value)}catch(err){alert('固定時段儲存失敗：'+err.message)}};
const oldAvSave=avSave;avSave=function(){if(dbToken)return dbSaveExceptions();oldAvSave()};
// No automatic login/session persistence: user must explicitly sign in after reload.
try{render()}catch(e){document.getElementById('app').textContent='網站初始化失敗：'+e.message;console.error(e)}
