/* Load DMS only on an explicit forecast button click. */
(function(){
let busy=false;
window.schedulerRunForecast=async function(){
 if(busy)return;
 if(!dbToken||!state.dbLoaded){alert('請先登入中心帳號');return;}
 busy=true;
 const buttons=[...document.querySelectorAll('button')].filter(b=>b.getAttribute('onclick')==='schedulerRunForecast()');
 for(const b of buttons){b.disabled=true;b.textContent='正在讀取 DMS 並預測…';}
 try{await window.dbLoadEightWeeks();}
 catch(e){alert('TC 預測讀取失敗：'+e.message);}
 finally{busy=false;render();}
};
})();
