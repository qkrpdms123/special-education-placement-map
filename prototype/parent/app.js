'use strict';
const $=s=>document.querySelector(s);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const distance=n=>n===null?'미확인':n<1000?`${n}m`:`${(n/1000).toFixed(2)}km`;
const teachers=[{id:'a',name:'김이음',school:'햇살초등학교'},{id:'b',name:'박다온',school:'햇살초등학교'},{id:'c',name:'이하늘',school:'다온초등학교'}];
let state={conditions:{...DEFAULT_CONDITIONS},applied:false,preferences:[],teacher:null,teacherSchool:'햇살초등학교',submission:null};
function validSnapshot(s){return s&&validConditions(s.conditions)&&!conditionErrors(s.conditions).length&&['submitted','checked','revision'].includes(s.status)&&teachers.some(t=>t.id===s.teacher)&&typeof s.date==='string'&&s.date.length<100&&Array.isArray(s.preferences)&&s.preferences.length<=SEOUL_RULES[s.conditions.district].preference&&new Set(s.preferences).size===s.preferences.length&&s.preferences.every(id=>makeSchools(s.conditions.district).some(x=>x.id===id&&eligible(x,s.conditions)));}
try{
  const saved=JSON.parse(localStorage.getItem('placement-parent-seoul-v2'));
  if(saved&&validConditions(saved.conditions)){
    state.conditions={...saved.conditions};state.applied=saved.applied===true&&!conditionErrors(saved.conditions).length;
    const candidates=makeSchools(state.conditions.district);
    if(Array.isArray(saved.preferences))state.preferences=[...new Set(saved.preferences)].filter(id=>candidates.some(s=>s.id===id&&eligible(s,state.conditions))).slice(0,SEOUL_RULES[state.conditions.district].preference);
    if(teachers.some(t=>t.id===saved.teacher)){state.teacher=saved.teacher;state.teacherSchool=teachers.find(t=>t.id===saved.teacher).school;}
    if(validSnapshot(saved.submission)){state.submission=saved.submission;if(saved.submission.status!=='revision'){state.conditions={...saved.submission.conditions};state.preferences=[...saved.submission.preferences];state.teacher=saved.submission.teacher;state.teacherSchool=teachers.find(t=>t.id===state.teacher).school;state.applied=true;}}
  }
}catch(e){}
let filter='all',query='',sort='walk',active='s1',page='explore',zoom=1,toastTimer;
function rule(){return SEOUL_RULES[state.conditions.district];}
function schools(){return makeSchools(state.conditions.district);}
function school(id){return schools().find(s=>s.id===id);}
function rows(){return state.applied?previewRows(state.conditions,schools()):[];}
function locked(){return !!state.submission&&state.submission.status!=='revision';}
function persist(){try{localStorage.setItem('placement-parent-seoul-v2',JSON.stringify(state));}catch(e){toast('브라우저 저장이 제한되어 현재 화면에서만 유지됩니다.');}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function openModal(html){$('#modalContent').innerHTML=html;$('#modal').showModal();}
function homeText(c){return !c.home?'출발 조건 입력 전':`${c.district} 관할 · ${c.home==='house'?'햇살로 10 단독주택 (가상)':`햇살로 20 햇살아파트${c.building?' '+c.building+'동':''} (가상)`}`;}
function options(values,current){return values.map(([v,label])=>`<option value="${v}" ${current===v?'selected':''}>${label}</option>`).join('');}
function field(name,title,values){return `<label class="condition-field"><span>${title}</span><select data-condition="${name}" ${locked()?'disabled':''}>${options(values,state.conditions[name])}</select></label>`;}
function renderConditions(){
 const c=state.conditions;
 $('#conditionsPanel').innerHTML=`<div class="eyebrow">먼저 확인해 주세요</div><h2>우리 아이의 배치 조건</h2><p class="condition-caption">지도와 함께 입력하세요. 현재는 예시 주소만 선택할 수 있으며 실제 주소 검색·관할 판정은 연결 전입니다.</p><div class="conditions-grid">
 ${field('year','입학연도',[['2027','2027학년도']])}
 ${field('district','관할 교육지원청',Object.keys(SEOUL_RULES).map(d=>[d,d]))}
 ${field('home','주민등록상 거주 출발점 *',[['','선택해 주세요'],['apartment','햇살아파트 · 가상 주소'],['house','햇살로 단독주택 · 가상 주소']])}
 ${c.home==='apartment'?field('building',`아파트 동 ${rule().building?'*':'(예시 위치 선택)'}`,[['','선택해 주세요'],['101','101동'],['102','102동']]):''}
 </div>${rule().building&&c.home==='apartment'?'<p class="inline-note">강동송파는 아파트 동까지 출발점을 지정합니다. 호수는 수집하지 않습니다.</p>':''}
 ${field('residence','주민등록·실거주 확인 *',[['','선택해 주세요'],['yes','요건 확인 예시'],['review','선생님 확인 필요']])}
 <p class="condition-caption">접수일 기준 전 가족이 서울에 단독 세대로 주민등록되어 실제 거주하는지 확인합니다. 대상·예외는 교사에게 확인하세요.</p>
 ${field('applicant','신청유형 *',[['','선택해 주세요'],['existing','기존 특수교육대상자'],['new','신규 신청'],['reselection','학교급 변경 재선정'],['unknown','잘 모르겠어요 · 상담 필요']])}
 ${field('classType','일반학교 배치 희망 학급유형 *',[['','선택해 주세요'],['special','특수학급'],['general','일반학급']])}
 <p class="condition-caption">일반학교 후보는 한 가지 학급유형으로 통일합니다.</p>
 ${field('parallel','특수학교 입학원서를 제출했나요? *',[['','선택해 주세요'],['no','아니요'],['yes','예 · 특수학교를 1순위로']])}
 ${c.parallel==='yes'?field('specialSchool','원서를 제출한 특수학교 *',[['','선택해 주세요'],['special-1',`${c.district} 푸른별학교 (가상)`]]):''}
 ${field('consult','특이배치 상담 필요 여부 (선택)',[['none','선택 안 함'],['yes','선생님과 상담하고 싶어요'],['unknown','해당 여부를 모르겠어요']])}
 <details class="condition-help"><summary>재선정·특이배치 안내</summary><p>건강장애, 정서·행동장애, 정서·행동장애를 수반한 중도중복장애는 초→중 전환 시 재선정 심의가 필요하다는 원문 조항이 있습니다. 장애 상세는 이 화면에서 받지 않습니다.</p><p>특이배치: 쌍둥이, 형제·자매, 교직원 자녀, 학교폭력 관련, 가정폭력 피해, 성폭력 피해. 상세 사유·증빙은 선생님과 별도 상담하며 근거리 순서를 자동 변경하지 않습니다.</p><p>형제·자매는 가족관계증명서(접수일 기준 3개월 이내), 재학증명서(공고일 이후 발급)를 확인합니다.</p></details>
 <button id="applyConditions" class="primary full" ${locked()?'disabled':''}>${state.applied?'조건 적용됨 · 후보 다시 보기':'조건 적용하고 후보 보기'}</button><p class="condition-caption">조건을 변경하면 기존 후보·희망학교 선택이 초기화됩니다.</p>`;
}
function renderRuleSummary(){const r=rule(),c=state.conditions;$('#ruleSummary').innerHTML=`<div class="rule-box"><strong>${c.district} · ${r.count===null?'근거리 행 수 확인 필요':`근거리 ${r.count}행 · 원문 대조값`}</strong><p>${r.count===null?`서식 ${r.tableCount}행 / 안내 ${r.textCount}개가 달라 순위를 표시하지 않습니다.`:'교사 검수 전으로 공식 순위를 확정하지 않습니다.'}</p><p>보호자 희망: ${r.preference===0?'원문에 별도 행 없음':r.preference===3?'1·2·3순위 입력 예시 · 해석 확인 필요':'별도 1개 행 · 필수 여부 확인 필요'}</p><p>기준 지도: 카카오맵 · 2km 미만 도보 / 이상 대중교통(자차 제외)</p><p>${r.route==='shortest'?'서부 대중교통: 최단거리 지정':'대중교통 경로 선택 기준: 교사 확인 필요'}</p><p>${state.applied?'아래 거리는 가상 예시입니다.':'조건 적용 전에는 거리·순위를 표시하지 않습니다.'}</p>${r.building?'<p>강동송파: 1km 미만은 m 단위 일의 자리까지 표기합니다.</p>':'<p>1km 미만 표시 단위는 원문 규정 미확인입니다. 화면 단위는 예시입니다.</p>'}<p>관할 문의: ${r.phone}</p><a href="${RULE_SOURCE}" target="_blank" rel="noopener">서울 배치조건 근거 보기 ↗</a></div>`;}
function badge(s){return s.type==='class'?'<span class="badge">일반학교 · 특수학급 설치 예시</span>':s.type==='special'?'<span class="badge purple">특수학교</span>':'<span class="badge gray">일반학교 · 특수학급 설치 미확인</span>';}
function routeHtml(s){if(!state.applied)return '<p class="condition-caption">출발 조건을 적용하면 예시 거리를 표시합니다.</p>';const m=metricsFor(s,state.conditions);return `<div class="routes"><div>도보 <b>${m.minutes}분</b><br><small>${distance(m.walk)} · 예시</small></div><div>대중교통 <b>${m.transit===null?'확인 필요':m.transit+'분'}</b><br><small>${distance(m.td)}${m.transfers===null?'':` · ${m.transfers===0?'직행':m.transfers+'회 환승'}`}</small></div></div>`;}
function preferenceButton(s){if(!state.applied||!eligible(s,state.conditions)||rule().preference===0)return '';return `<button class="add" data-add="${s.id}" ${locked()?'disabled':''}>${state.preferences.includes(s.id)?'✓ 보호자 희망 선택됨':'+ 보호자 희망'}</button>`;}
function renderSchools(){
 const list=schools().filter(s=>(filter==='all'||(filter==='class'?s.type!=='special':s.type==='special'))&&s.name.includes(query)).sort((a,b)=>state.applied?(metricsFor(a,state.conditions)[sort]??Infinity)-(metricsFor(b,state.conditions)[sort]??Infinity):0);
 $('#resultCount').textContent=list.length;
 const preview=rows();
 $('#schoolList').innerHTML=list.length?list.map(s=>{const rank=preview.findIndex(n=>n.id===s.id)+1;return `<article class="school-card ${s.id===active?'active':''}"><div class="card-top"><span class="rank ${rank?'':'other'}">${rank||'•'}</span><h3>${s.name}</h3></div><div class="address">${s.district} 관할 가상 기관${rank?' · 순위 예시 '+rank:''}</div>${badge(s)}${routeHtml(s)}<div class="card-actions"><button data-detail="${s.id}">통학정보 보기</button>${preferenceButton(s)}</div></article>`;}).join(''):'<div class="empty">검색 결과가 없습니다.</div>';
 $('#markers').innerHTML=list.map(s=>{const rank=preview.findIndex(n=>n.id===s.id)+1;return `<button class="marker ${s.type} ${s.id===active?'active':''}" style="left:${s.x}%;top:${s.y}%" data-detail="${s.id}" aria-label="${s.name} ${rank?'순위 예시 '+rank:''}">${rank||'•'}<span>${s.name}</span></button>`;}).join('');
 const a=school(active);$('#route').style.display=state.applied?'':'none';$('#route').setAttribute('d',`M460 400 L${a.x*9} 400 L${a.x*9} ${a.y*7}`);
 $('#mapDistrict').textContent=`⌖ ${state.conditions.district} · 가상 기관·개념도`;
}
function detail(id){const s=school(id);if(!s)return;active=id;renderSchools();const c=state.conditions;openModal(`<div class="eyebrow">${c.district} · 실제 기관이 아닌 가상 데이터</div><h2>${s.name}</h2>${badge(s)}${routeHtml(s)}<p>${s.type==='special'?'특수학교 원서를 제출했다면 지도 옆 조건에서 병행 신청 여부와 학교를 선택해 주세요. 근거리 행 수가 확인된 관할의 예시에서는 1순위에 고정됩니다.':eligible(s,c)?'현재 선택한 학급유형의 비교 후보입니다. 실제 배치 가능성을 의미하지 않습니다.':'특수학급 설치가 미확인되어 특수학급 후보에 포함하지 않습니다.'}</p><p>공식 경로는 카카오맵에서 확인합니다. 대체 경로와의 차이, 2km 판정 거리·도착점·정렬 기준은 교사 검수가 필요합니다.</p><a href="https://map.kakao.com/" target="_blank" rel="noopener">카카오맵 열기 ↗</a><p>가상 학교는 실제 길찾기로 연결하지 않습니다.</p>${preferenceButton(s)}`);}
function nearbyHtml(c){const r=SEOUL_RULES[c.district],list=previewRows(c,makeSchools(c.district));if(r.count===null)return `<div class="empty">근거리 행 수 확인 전입니다.<br>서식 ${r.tableCount}행 / 작성 안내 ${r.textCount}개 · ${r.phone}<br>임의로 3·4·5순위를 채우지 않습니다.</div>`;if(c.residence!=='yes')return '<div class="empty">거주 요건을 교사와 확인한 뒤 후보 순위를 검토합니다.</div>';return list.map((s,i)=>`<div class="choice-row"><span class="rank">${i+1}</span><div><strong>${s.name}</strong><small>${s.type==='special'?'특수학교 원서 제출 · 1순위 분기 예시':`${c.classType==='special'?'특수학급':'일반학급'} · 도보 ${distance(metricsFor(s,c).walk)} · 거리순 예시`}</small></div></div>`).join('')+(list.length<r.count?`<p class="warning">후보 부족: ${r.count}행 중 ${list.length}개만 확인됩니다. 가짜 후보로 채우지 않습니다.</p>`:'');}
function issuesHtml(c){return `<ul class="issues">${ruleIssues(c).map(x=>`<li>${x}</li>`).join('')}</ul>`;}
function renderChoices(){
 if(!state.applied){$('#choices').innerHTML='<div class="content-box empty"><h2>지도에서 배치 조건을 먼저 입력해 주세요.</h2><p>관할·출발점·학급유형·특수학교 병행 여부에 따라 후보가 달라집니다.</p><br><button class="primary" data-page="explore">조건 입력하기 →</button></div>';return;}
 const c=state.conditions,r=rule();
 $('#choices').innerHTML=`<div class="content-box"><div class="eyebrow">${c.district} · 2027학년도</div><h2>근거리 후보 검토 · ${r.count===null?'행 수 미확정':r.count+'행 예시'}</h2><p>공식 순위가 아닙니다. 일반학교는 도보거리로만 정렬한 예시이며, 보호자 희망으로 순서를 바꾸지 않습니다.</p>${nearbyHtml(c)}<details class="condition-help" open><summary>선생님 확인이 필요한 기준</summary>${issuesHtml(c)}</details></div>
 <div class="content-box"><h2>보호자 희망학교</h2><p>${r.preference===0?'북부 서식에는 별도 희망학교 행이 없습니다. 보호자 의견은 선생님과 상담해 주세요.':r.preference===3?'중부는 희망교 1·2·3순위 문구가 있습니다. 3개 선택 예시이며 최종 해석은 지원청 확인이 필요합니다.':'근거리와 별개인 보호자 희망 1개 행입니다. 근거리 후보와 같은 학교를 선택할 수 있습니다.'}</p>
 ${state.preferences.map((id,i)=>`<div class="choice-row"><span class="rank">${i+1}</span><strong>${school(id).name}</strong><div class="actions">${r.preference>1?`<button data-move="${i},-1" ${i===0||locked()?'disabled':''} aria-label="희망 순위 올리기">↑</button><button data-move="${i},1" ${i===state.preferences.length-1||locked()?'disabled':''} aria-label="희망 순위 내리기">↓</button>`:''}<button data-remove="${id}" ${locked()?'disabled':''} aria-label="희망학교 삭제">×</button></div></div>`).join('')}
 ${r.preference?`<div class="submit-bar"><small>${state.preferences.length}/${r.preference}개 선택 · 필수 기재 여부 교사 확인</small><button data-page="explore">지도에서 선택 →</button></div>`:''}</div>
 <div class="content-box"><h2>담당 선생님께 확인 요청</h2><p>미확정 기준까지 함께 확인 요청하는 체험입니다. 공식 배치 신청서를 제출하는 기능이 아닙니다.</p><label class="field"><span>현재 재학 학교 · 가상 예시</span><select id="teacherSchool" ${locked()?'disabled':''}>${options([['햇살초등학교','햇살초등학교'],['다온초등학교','다온초등학교']],state.teacherSchool)}</select></label><div id="teachers" class="teacher-grid"></div><div class="submit-bar"><label><input id="consent" type="checkbox" ${locked()?'disabled':''}> 예시 후보와 확인 필요 항목을 검토했습니다.</label><button id="submit" class="primary" ${locked()?'disabled':''}>선생님께 확인 요청 (체험) →</button></div></div>`;
 renderTeachers();
}
function renderTeachers(){if(!$('#teachers'))return;$('#teachers').innerHTML=teachers.filter(t=>t.school===state.teacherSchool).map(t=>`<button class="teacher ${state.teacher===t.id?'selected':''}" data-teacher="${t.id}" ${locked()?'disabled':''} aria-pressed="${state.teacher===t.id}"><span class="teacher-avatar">${t.name[0]}</span><span><strong>${t.name} 선생님</strong><small>${state.conditions.district} · ${t.school} · 가상 인물</small></span></button>`).join('');}
function requestReview(){if(locked())return;if(!state.applied||conditionErrors(state.conditions).length)return toast('지도에서 필수 조건을 먼저 적용해 주세요.');if(!state.teacher)return toast('담당 선생님을 선택해 주세요.');if(!$('#consent').checked)return toast('검토 확인에 체크해 주세요.');state.submission={conditions:{...state.conditions},preferences:[...state.preferences],teacher:state.teacher,status:'submitted',date:new Date().toLocaleString('ko-KR')};persist();showPage('status');toast('확인 요청 체험을 저장했습니다. 실제로 전송되지 않습니다.');}
function renderStatus(){const s=state.submission;if(!s){$('#status').innerHTML='<div class="content-box empty"><h2>아직 확인 요청한 내용이 없어요.</h2><br><button data-page="choices">후보·희망학교 확인 →</button></div>';return;}const t=teachers.find(t=>t.id===s.teacher);$('#status').innerHTML=`<div class="content-box"><div class="eyebrow">확인 요청 현황 · 이 브라우저에서만 저장</div><h2>${s.status==='submitted'?'선생님 확인 대기':s.status==='checked'?'제출 내용 확인 · 기준 검증 대기':'수정 요청 · 조건과 희망학교를 확인해 주세요'}</h2><p>${s.conditions.district} · ${t.school} ${t.name} 선생님 · ${escapeHtml(s.date)}</p><div class="state-banner"><strong>공식 순위·배치 미확정</strong><p>원문 규칙과 카카오맵 경로 검증이 남아 있어 검증 완료로 처리할 수 없습니다.</p></div><h3>요청 시점의 조건</h3><p>${homeText(s.conditions)}<br>${s.conditions.classType==='special'?'특수학급':'일반학급'} · 특수학교 원서 ${s.conditions.parallel==='yes'?'제출':'미제출'}</p>${nearbyHtml(s.conditions)}<p>신청유형: ${{existing:'기존 선정',new:'신규 신청',reselection:'학교급 변경 재선정',unknown:'교사 확인 필요'}[s.conditions.applicant]} · 거주 요건: ${s.conditions.residence==='yes'?'확인 예시':'교사 확인 필요'}<br>특이배치 상담: ${s.conditions.consult==='none'?'선택 안 함':'상담 요청'}</p><h3>보호자 희망</h3><p>${s.preferences.length?s.preferences.map(id=>makeSchools(s.conditions.district).find(x=>x.id===id).name).join(' → '):'선택 없음 / 별도 상담'}</p>${issuesHtml(s.conditions)}<div class="submit-bar"><button id="cancelSubmission">확인 요청 취소하고 수정</button>${s.status==='revision'?'<button class="primary" data-page="explore">조건·희망학교 수정 →</button>':''}</div><div class="review-demo"><strong>선생님 상태 변경 체험</strong><p>실제 선생님 계정은 연결 전입니다. 원문 미검수 상태이므로 검증 완료 버튼은 잠겨 있습니다.</p><button data-review="checked" ${s.status!=='submitted'?'disabled':''}>제출 내용 확인</button><button data-review="revision" ${s.status==='revision'?'disabled':''}>수정 요청</button><button disabled>검증 완료 · 기준 확인 필요</button></div></div>`;}
function render(){
 $('#choiceCount').textContent=state.preferences.length;$('#homeLabel').textContent=homeText(state.conditions);$('#districtLabel').textContent=state.conditions.district+'교육지원청';
 renderConditions();renderRuleSummary();renderSchools();renderChoices();renderStatus();
}
function showPage(next){page=next;document.querySelectorAll('.page').forEach(e=>e.hidden=e.id!==page);document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.dataset.page===page));document.querySelectorAll('.steps span').forEach((e,i)=>e.classList.toggle('current',i==={explore:0,choices:1,status:2}[page]));render();window.scrollTo({top:0,behavior:'smooth'});}
function changeCondition(key,value){if(locked()||!CONDITION_VALUES[key]?.includes(value))return;state.conditions[key]=value;if(key==='home'&&value!=='apartment')state.conditions.building='';if(key==='parallel'&&value!=='yes')state.conditions.specialSchool='';if(key==='district'){state.conditions.specialSchool='';state.conditions.building='';state.teacher=null;filter='all';query='';$('#search').value='';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter==='all'));}state.applied=false;state.preferences=[];persist();render();document.querySelector(`[data-condition="${key}"]`)?.focus();}
function applyConditions(){if(locked())return;const errors=conditionErrors(state.conditions);if(errors.length){toast('입력 필요: '+errors.join(', '));return;}state.applied=true;state.submission=null;persist();render();toast(rule().count===null?'조건 적용됨 · 해당 관할은 행 수 확인 전까지 순위를 표시하지 않습니다.':'조건 적용됨 · 공식 순위가 아닌 도보거리순 예시입니다.');}
function addPreference(id){if(locked())return toast('확인 요청을 취소한 뒤 수정해 주세요.');const s=school(id);if(!state.applied||!s||!eligible(s,state.conditions)||rule().preference===0)return;if(state.preferences.includes(id))return toast('이미 선택한 희망학교입니다.');if(state.preferences.length>=rule().preference)return toast(`이 관할의 희망 입력 예시는 ${rule().preference}개입니다. 기존 선택을 삭제한 뒤 변경해 주세요.`);state.preferences.push(id);persist();render();if($('#modal').open)$('#modal').close();toast('보호자 희망에 담았습니다. 근거리 순서는 바뀌지 않습니다.');}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.page)showPage(b.dataset.page);
 if(b.dataset.filter){filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));renderSchools();}
 if(b.dataset.detail)detail(b.dataset.detail);
 if(b.dataset.add)addPreference(b.dataset.add);
 if(b.id==='applyConditions')applyConditions();
 if(b.dataset.remove&&!locked()){state.preferences=state.preferences.filter(id=>id!==b.dataset.remove);persist();render();}
 if(b.dataset.move&&!locked()){const [i,d]=b.dataset.move.split(',').map(Number);if(i+d>=0&&i+d<state.preferences.length){[state.preferences[i],state.preferences[i+d]]=[state.preferences[i+d],state.preferences[i]];persist();render();}}
 if(b.dataset.teacher&&!locked()&&teachers.some(t=>t.id===b.dataset.teacher&&t.school===state.teacherSchool)){state.teacher=b.dataset.teacher;persist();renderTeachers();}
 if(b.id==='submit')requestReview();
 if(b.dataset.review&&state.submission){const previous=state.submission.status,next=b.dataset.review;if((next==='checked'&&previous==='submitted')||(next==='revision'&&['submitted','checked'].includes(previous))){state.submission.status=next;persist();render();}}
 if(b.id==='cancelSubmission')openModal('<h2>확인 요청을 취소할까요?</h2><p>현재 조건과 희망학교를 유지하고 검수 상태를 초기화합니다.</p><div class="modal-actions"><button id="keepSubmission">유지하기</button><button id="confirmCancel" class="primary">취소하고 수정</button></div>');
 if(b.id==='keepSubmission')$('#modal').close();
 if(b.id==='confirmCancel'){state.submission=null;persist();$('#modal').close();showPage('explore');}
});
document.addEventListener('change',e=>{if(e.target.dataset.condition)changeCondition(e.target.dataset.condition,e.target.value);if(e.target.id==='teacherSchool'&&!locked()){state.teacherSchool=e.target.value;state.teacher=null;persist();renderTeachers();}});
$('#search').addEventListener('input',e=>{query=e.target.value.trim();renderSchools();});$('#sort').addEventListener('change',e=>{sort=e.target.value;renderSchools();});
$('#closeModal').onclick=()=>$('#modal').close();
$('#guide').onclick=()=>openModal(`<h2>서울 중입배치 MAP 이용 순서</h2><p>① 지도 옆에서 관할·출발점·신청유형·학급유형·특수학교 원서 제출 여부를 입력합니다.</p><p>② 관할별 3·4·5행 후보 예시와 별도의 보호자 희망학교를 확인합니다. 원문이 충돌하는 3개 관할은 순위 산출을 보류합니다.</p><p>③ 선생님을 선택해 미확정 조건과 후보를 함께 확인 요청합니다.</p><p>모든 학교·주소·거리는 가상 데이터이며 실제 신청이나 전송이 아닙니다. 현재 공개된 원문 대조값도 교사 미검수 상태입니다.</p><a href="${RULE_SOURCE}" target="_blank" rel="noopener">근거 검토본 보기 ↗</a>`);
function setZoom(v){zoom=Math.max(1,Math.min(1.8,v));$('#mapCanvas').style.transform=`scale(${zoom})`;$('#zoomOut').disabled=zoom===1;$('#zoomIn').disabled=zoom>=1.8;}
$('#zoomIn').onclick=()=>setZoom(zoom+.2);$('#zoomOut').onclick=()=>setZoom(zoom-.2);$('#recenter').onclick=()=>setZoom(1);setZoom(1);render();
