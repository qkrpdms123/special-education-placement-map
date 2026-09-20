let passed=[];
function check(value,label){if(!value)throw Error(label);passed.push(label);}
function conditions(district='동부',overrides={}){return {...DEFAULT_CONDITIONS,district,home:'apartment',building:'101',residence:'yes',applicant:'existing',classType:'special',parallel:'no',...overrides};}
check(Object.keys(SEOUL_RULES).length===11,'서울 11개 관할');
for(const [district,r] of Object.entries(SEOUL_RULES)){
 const c=conditions(district),list=makeSchools(district),result=previewRows(c,list);
 check(result.length===(r.count??0),`${district}: 행 수 또는 산출 보류`);
 check(result.every(s=>s.district===district),`${district}: 관할 혼합 방지`);
 if(r.count){const parallel=previewRows({...c,parallel:'yes',specialSchool:'special-1'},list);check(parallel.length===r.count&&parallel[0].id==='special-1'&&new Set(parallel.map(s=>s.id)).size===r.count,`${district}: 특수학교 1순위 및 일반학교 후속 순위`);}
}
check(routeMode(1999)==='walk'&&routeMode(2000)==='transit'&&routeMode(2001)==='transit','2km 미만/이상 경계');
check(routeMode(null)===null&&routeMode(-1)===null,'미확인 거리를 0으로 처리하지 않음');
check(SEOUL_RULES['북부'].preference===0,'북부 희망 행 없음');
check(SEOUL_RULES['중부'].preference===3,'중부 희망 복수 입력 예시');
check(Object.values(SEOUL_RULES).filter(r=>r.route==='shortest').length===1,'서부만 대중교통 최단거리 명시');
check(conditionErrors(conditions('강동송파',{building:''})).includes('아파트 동'),'강동송파 아파트 동 필수');
check(!conditionErrors(conditions('강동송파',{home:'house',building:''})).length,'강동송파 단독주택에 동 요구하지 않음');
check(!conditionErrors(conditions('동부',{building:''})).length,'다른 관할에 동 필수 규칙 확대하지 않음');
check(conditionErrors(conditions('동부',{parallel:'yes',specialSchool:''})).includes('원서를 제출한 특수학교'),'병행 신청 학교 필수');
check(previewRows(conditions('동부',{residence:'review'}),makeSchools('동부')).length===0,'거주 요건 미확인 순위 보류');
check(previewRows({...DEFAULT_CONDITIONS},makeSchools('강동송파')).length===0,'초기 조건 미입력 순위 없음');
const unknown=makeSchools('동부').find(s=>s.type==='unknown');
check(!eligible(unknown,conditions())&&eligible(unknown,conditions('동부',{classType:'general'})),'학급유형별 후보 분리');
check(!eligible(makeSchools('동부').find(s=>s.type==='special'),conditions('동부',{classType:'general'})),'특수학교를 일반학교 후보와 혼합하지 않음');
check(previewRows(conditions('서부'),makeSchools('서부').slice(0,2)).length===2,'후보 부족 시 가짜 행 생성하지 않음');
check(metricsFor(makeSchools('서부')[4],conditions('서부')).td===null,'경로 미확인 유지');
check(previewRows(conditions('동부',{building:'102'}),makeSchools('동부'))[0].id==='s2','출발 동 변경 시 예시 순서 갱신');
state={conditions:conditions(),applied:true,preferences:[],teacher:null,teacherSchool:'햇살초등학교',submission:null};
const initial=rows().map(s=>s.id).join();addPreference('s2');addPreference('s2');check(state.preferences.length===1,'보호자 희망 중복 방지');addPreference('s3');check(state.preferences.length===1,'관할별 희망 행 제한');check(rows().map(s=>s.id).join()===initial,'보호자 희망이 근거리 순서를 바꾸지 않음');
requestReview();check(state.submission===null,'선생님 미선택 요청 방지');state.teacher='a';$('#consent').checked=false;requestReview();check(state.submission===null,'검토 확인 미체크 요청 방지');$('#consent').checked=true;requestReview();check(state.submission.status==='submitted','확인 요청 생성');
changeCondition('district','서부');check(state.conditions.district==='동부','요청 후 조건 수정 잠금');check(validSnapshot(state.submission),'정상 요청 스냅샷 복원 가능');check(!validSnapshot({...state.submission,status:'verified'}),'저장값으로 검증 완료 우회 방지');
state.submission.status='revision';changeCondition('district','서부');check(!state.applied&&state.preferences.length===0&&state.teacher===null,'관할 변경 시 이전 계산·희망·교사 초기화');check(rows().length===0,'새 조건 적용 전 순위 없음');applyConditions();check(rows().length===5&&state.submission===null,'새 조건 적용 시 후보 재산출 및 과거 요청 제거');
state.conditions=conditions('북부');state.preferences=[];addPreference('s1');check(state.preferences.length===0,'북부 희망 추가 차단');
state.conditions=conditions('중부');addPreference('s1');addPreference('s2');addPreference('s3');addPreference('s4');check(state.preferences.length===3,'중부 복수 희망 3개 제한');
state.conditions=conditions('강동송파');state.preferences=[];render();check($('#markers').innerHTML.indexOf('순위 예시')===-1,'미확정 관할 지도에 순위 번호 미표시');
filter='special';renderSchools();check($('#resultCount').textContent===1,'특수학교 필터');query='없는학교';renderSchools();check($('#resultCount').textContent===0,'검색 결과 없음');
JSON.stringify({passed:passed.length,checks:passed});
