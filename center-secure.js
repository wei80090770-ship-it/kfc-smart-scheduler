/* Security gate: no center data or editing is visible without an authenticated center profile. */
(()=>{
const style=document.createElement('style');style.textContent=`body.scheduler-locked #app{display:none!important}#scheduler-login-gate{position:fixed;inset:0;z-index:99999;background:#f5f6f8;display:flex;align-items:center;justify-content:center;font-family:Arial,'Microsoft JhengHei',sans-serif}#scheduler-login-gate .gate-card{background:white;border-radius:12px;padding:28px;width:min(420px,90vw);box-shadow:0 12px 35px #0002}#scheduler-login-gate input{display:block;width:100%;box-sizing:border-box;margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:7px}#scheduler-login-gate button{width:100%;padding:12px;background:#b7192f;color:white;border:0;border-radius:7px;cursor:pointer}#scheduler-login-gate p{line-height:1.6;color:#566;font-size:13px}`;document.head.append(style);
const gate=document.createElement('div');gate.id='scheduler-login-gate';gate.innerHTML='<div class="gate-card"><h2>KFC 智慧排班｜中心登入</h2><p>每個中心帳號只能查看、修改與發布自己中心的資料。登入只載入中心基本資料；按「預測 TC」才讀取 DMS。</p><input id="gate-email" type="email" autocomplete="username" placeholder="中心帳號 Email"><input id="gate-password" type="password" autocomplete="current-password" placeholder="密碼"><button id="gate-login">登入中心</button><p id="gate-status">尚未登入</p></div>';document.body.append(gate);document.body.classList.add('scheduler-locked');
const status=s=>{document.getElementById('gate-status').textContent=s};
const unlock=()=>{if(!dbToken||!dbProfile?.center_id||!state.dbLoaded)return;gate.style.display='none';document.body.classList.remove('scheduler-locked');};
window.schedulerCenterUnlock=unlock;
document.getElementById('gate-login').onclick=async()=>{
 const email=document.getElementById('gate-email').value.trim(),password=document.getElementById('gate-password').value;
 if(!email||!password)return status('請輸入帳號與密碼');status('驗證帳號並載入中心基本資料中…');
 try{
  const result=await dbRequest('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  dbToken=result.access_token;
  const profiles=await dbRequest('/rest/v1/rpc/scheduler_my_profile',{method:'POST',body:'{}'});
  if(profiles.length!==1||!profiles[0].center_id)throw Error('帳號沒有有效的所屬中心設定');
  dbProfile=profiles[0];dbCenter=dbProfile.center_id;
  await dbLoad();
  if(!state.dbLoaded)throw Error('中心資料同步未完成；請確認資料庫權限與 SQL');
  document.getElementById('gate-password').value='';unlock();
 }catch(e){dbToken=null;dbProfile=null;dbCenter=null;state.dbLoaded=false;status('登入失敗：'+e.message)}
};
const originalLogout=dbLogout;
dbLogout=function(){originalLogout();state.dbLoaded=false;gate.style.display='flex';document.body.classList.add('scheduler-locked');status('已登出')};
})();
