/* Historical holiday mapping: uses actual special_days.event_key, never guessed holiday dates. */
(function(){
const originalEightWeekLoad=window.dbLoadEightWeeks;
const asISO=(d)=>{const z=new Date(d+'T12:00:00');return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`};
const priorYear=(d)=>{const z=new Date(d+'T12:00:00');z.setFullYear(z.getFullYear()-1);return asISO(`${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`)};
let holidayRows=[],holidayData=[];
function holidayType(date){
 const today=holidayRows.filter(x=>x.event_date===date && (!x.center_id||x.center_id===dbCenter));
 const prev=plus(date,-1),next=plus(date,1);
 const prevHoliday=holidayRows.some(x=>x.event_date===prev&&(!x.center_id||x.center_id===dbCenter));
 const nextHoliday=holidayRows.some(x=>x.event_date===next&&(!x.center_id||x.center_id===dbCenter));
 const relevant=today.find(x=>x.event_key);
 if(relevant)return {kind:'holiday',event:relevant.event_key,label:relevant.event_name};
 // The eve of a contiguous multi-day holiday is treated as Friday. No adjustment if already Friday.
 if(nextHoliday){let cursor=next,count=0;while(count<14&&holidayRows.some(x=>x.event_date===cursor&&(!x.center_id||x.center_id===dbCenter))){count++;cursor=plus(cursor,1)}if(count>=2)return {kind:'eve',label:'連假前一天，視同星期五'}};
 return {kind:'regular',label:'一般日期'};
}
window.schedulerHolidayType=holidayType;
function matchedDates(date){const kind=holidayType(date);if(kind.kind==='holiday'){
 const lastYear=Number(date.slice(0,4))-1;
 const matches=holidayRows.filter(x=>x.event_key===kind.event&&x.event_date.startsWith(String(lastYear))&&(!x.center_id||x.center_id===dbCenter));
 return {dates:[...new Set(matches.map(x=>x.event_date))],kind:kind.kind,label:kind.label};
 }
 if(kind.kind==='eve'){
 const shift=(daykey(date)-5+7)%7,friday=plus(date,-shift);
 return {dates:Array.from({length:8},(_,i)=>plus(friday,-7*(i+1))),kind:'eve',label:kind.label};
 }
 return {dates:Array.from({length:8},(_,i)=>plus(date,-7*(i+1))),kind:'regular',label:kind.label};
}
window.schedulerMatchedDates=matchedDates;
async function fetchPaged(path){let all=[];for(let offset=0;offset<100000;offset+=1000){let chunk=await dbRequest(path+(path.includes('?')?'&':'?')+'limit=1000&offset='+offset);all.push(...chunk);if(chunk.length<1000)return all;}throw Error('資料超過分頁限制')}
window.dbLoadEightWeeks=async function(){if(!dbToken||!dbCenter)return;
 const date=state.date,kind=holidayType(date),base=matchedDates(date);
 try{
 const year=Number(date.slice(0,4));
 holidayRows=await fetchPaged('/rest/v1/special_days?select=event_date,event_key,event_name,center_id&event_date=gte.'+(year-1)+'-01-01&event_date=lte.'+year+'-12-31');
 const chosen=matchedDates(date);const dates=chosen.dates;
 if(!dates.length){state.historyTC=[];state.historyWindow={rows:0,error:'去年沒有對應的國定假日紀錄'};render();return;}
 const earliest=[...dates].sort()[0],latest=[...dates].sort().at(-1);
 const raw=await fetchPaged('/rest/v1/dms_30m?select=restaurant_id,business_date,bucket_time,own_tc&center_id=eq.'+encodeURIComponent(dbCenter)+'&business_date=gte.'+earliest+'&business_date=lte.'+latest+'&order=business_date.asc');
 const rest=new Map((state.dbRestaurants||[]).map(r=>[String(r.id),r]));const allowed=new Set(dates);
 state.historyTC=raw.filter(r=>allowed.has(r.business_date)&&rest.has(String(r.restaurant_id))).map(r=>({date:r.business_date,restaurant:rest.get(String(r.restaurant_id)).restaurant_name,group:rest.get(String(r.restaurant_id)).region_code,time:String(r.bucket_time).slice(0,5),own_tc:Number(r.own_tc)}));
 state.historyWindow={rows:state.historyTC.length,dates,mode:chosen.kind,label:chosen.label};
 render();dbMessage('TC 預測已同步：'+chosen.label+'；有效歷史紀錄 '+state.historyTC.length+' 筆');
 }catch(e){state.historyWindow={rows:0,error:e.message};dbMessage('TC 預測同步失敗：'+e.message);render();}
};
window.schedulerPredict=function(date,restaurant,time){const chosen=state.historyWindow?.dates||[];const matches=state.historyTC||[];let total=0,count=0;for(const d of chosen){const r=matches.find(x=>x.date===d&&x.restaurant===restaurant&&x.time===time);if(r&&Number.isFinite(Number(r.own_tc))){total+=Number(r.own_tc);count++}}return {value:count?Math.round(total/count):null,weeks:count}};
// Use only actual history; null means insufficient data, never silently turn it into a valid zero.
tc=function(g,i){const rs=restaurants[g]||[];if(!dbToken||!state.historyWindow?.dates||!rs.length)return null;const vals=rs.map(r=>window.schedulerPredict(state.date,r,times[i]).value);return vals.some(x=>x===null)?null:vals.reduce((a,b)=>a+b,0)};
const oldForecast=forecastPage;
forecastPage=function(){const info=state.historyWindow||{},label=info.label||'待讀取';const rs=restaurants[state.group]||[];return `<section class="panel"><h2>TC 需求預測｜歷史 OWN TC</h2>${datebar({group:true})}<div class="toolbar"><button class="primary" onclick="dbLoadEightWeeks()">重新同步預測</button><span class="tag">${esc(label)}</span><span class="tag">${info.rows||0} 筆紀錄</span></div><div class="note">一般日期：前8週同星期；連假前一天：前8個星期五；國定假日：去年相同 event_key 節日。缺資料不計入分母，真實0單計入。${info.error?'讀取異常：'+esc(info.error):''}</div><div class="scroll"><table class="table"><thead><tr><th>時段</th>${rs.map(r=>`<th>${esc(r)}</th>`).join('')}<th>Group OWN TC</th></tr></thead><tbody>${times.map((t,i)=>{const p=rs.map(r=>window.schedulerPredict(state.date,r,t));return `<tr><td>${t}</td>${p.map(x=>`<td>${x.value===null?'資料不足':x.value} (${x.weeks}/${info.dates?.length||8})</td>`).join('')}<td><b>${p.every(x=>x.value!==null)?p.reduce((s,x)=>s+x.value,0):'資料不足'}</b></td></tr>`}).join('')}</tbody></table></div></section>`};
const oldSetDate=setDate;setDate=function(d){oldSetDate(d);if(dbToken)window.dbLoadEightWeeks()};
render();
})();
