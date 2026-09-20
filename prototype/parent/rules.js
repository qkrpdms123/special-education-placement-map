'use strict';
// 원문 대조값이며 교사 검수 완료 규칙이 아님. 운영 자동 산정에 사용하지 않는다.
// 출처: docs/review/2027중입_배치조건_검토본.html §§1–6 (2026-09-20)
const SEOUL_RULES = Object.freeze({
  '동부':{count:3,preference:1,phone:'070-8831-4351'},
  '서부':{count:5,preference:1,phone:'02-715-0953',route:'shortest'},
  '남부':{count:3,preference:1,phone:'070-8895-2274',note:'공고 상세표시일 차이로 최종 판본 확인 필요'},
  '북부':{count:3,preference:0,phone:'02-956-1039',note:'원문에 보호자 희망 행 없음. 보호자 의견만 참고하며 지원청 확인 필요'},
  '중부':{count:3,preference:3,phone:'02-2027-7900',note:'희망교 1·2·3순위 문구의 해석 확인 필요. 아래는 3개 입력 예시'},
  '강남서초':{count:4,preference:1,phone:'070-4490-7064'},
  '강동송파':{count:null,tableCount:3,textCount:4,preference:1,phone:'02-414-2634',building:true},
  '강서양천':{count:5,preference:1,phone:'02-2620-2416'},
  '성동광진':{count:5,preference:1,phone:'02-2292-6411'},
  '성북강북':{count:null,tableCount:4,textCount:5,preference:1,phone:'070-5014-0853'},
  '동작관악':{count:null,tableCount:3,textCount:5,preference:1,phone:'02-833-2895'}
});
const RULE_SOURCE = '../../docs/review/2027중입_배치조건_검토본.html';
const DEFAULT_CONDITIONS = Object.freeze({year:'2027',district:'강동송파',home:'',building:'',residence:'',applicant:'',classType:'',parallel:'',specialSchool:'',consult:'none'});
const CONDITION_VALUES = {
  year:['2027'],district:Object.keys(SEOUL_RULES),home:['','apartment','house'],building:['','101','102'],
  residence:['','yes','review'],applicant:['','existing','new','reselection','unknown'],
  classType:['','special','general'],parallel:['','yes','no'],specialSchool:['','special-1'],consult:['none','yes','unknown']
};
function validConditions(c){return !!c&&Object.keys(CONDITION_VALUES).every(k=>CONDITION_VALUES[k].includes(c[k]));}
function conditionErrors(c){
  const missing=[];
  if(!validConditions(c))return ['입력 조건 형식을 확인해 주세요.'];
  if(!c.home)missing.push('주민등록상 거주 출발점');
  if(SEOUL_RULES[c.district].building&&c.home==='apartment'&&!c.building)missing.push('아파트 동');
  if(!c.residence)missing.push('주민등록·실거주 확인');
  if(!c.applicant)missing.push('신청유형');
  if(!c.classType)missing.push('배치 희망 학급유형');
  if(!c.parallel)missing.push('특수학교 입학원서 제출 여부');
  if(c.parallel==='yes'&&!c.specialSchool)missing.push('원서를 제출한 특수학교');
  return missing;
}
function routeMode(meters){return Number.isFinite(meters)&&meters>=0?(meters<2000?'walk':'transit'):null;}
function ruleIssues(c){
  const r=SEOUL_RULES[c.district],out=[];
  if(r.count===null)out.push(`근거리 행 수 미확정: 서식 ${r.tableCount}행 / 작성 안내 ${r.textCount}개. 지원청 확인 전 순위를 산출하지 않습니다.`);
  if(r.note)out.push(r.note);
  if(c.residence==='review')out.push('주민등록·실거주 요건을 선생님과 확인해야 합니다. 자동 적격 판단을 하지 않습니다.');
  if(c.applicant==='unknown')out.push('기존 선정 / 신규 / 재선정 신청유형을 확인해야 합니다.');
  if(c.applicant==='reselection')out.push('학교급 변경 재선정 심의와 필요한 서류를 확인해야 합니다.');
  if(c.consult!=='none')out.push('특이배치 상담이 필요합니다. 근거리 순서를 자동 변경하지 않습니다.');
  if(c.parallel==='yes')out.push('특수학교를 1순위에 두고 이후 일반학교를 기재하는 분기입니다. 기존 일반학교 신청서 제출 여부와 중복 제출 필요성을 교사와 확인하세요.');
  out.push(r.route==='shortest'?'서부: 원문은 대중교통 최단거리를 지정합니다. 카카오맵 경로 검증이 필요합니다.':'대중교통 복수 경로 선택 기준이 원문에 없어 교사 판단이 필요합니다.');
  out.push('2km 판정에 먼저 사용할 거리, 도착점, 이동수단 변경 후 정렬 방식은 확인이 필요합니다.');
  out.push('전체 규칙 교사 미검수 · 실제 경로 미연동. 현재 목록은 도보거리순 체험 예시이며 공식 순위가 아닙니다.');
  return out;
}
function makeSchools(district){
  // 각 관할에 동일한 시나리오를 생성하는 가상 fixture. 실제 기관 목록이 아님.
  return [
    {id:'s1',name:'햇살중학교',type:'class',walk:680,transit:8,td:1200,x:30,y:37,transfers:0},
    {id:'s2',name:'이음중학교',type:'class',walk:1240,transit:12,td:1800,x:66,y:43,transfers:0},
    {id:'s3',name:'다온중학교',type:'class',walk:1860,transit:15,td:2400,x:44,y:76,transfers:1},
    {id:'s4',name:'온유중학교',type:'class',walk:2000,transit:17,td:2700,x:77,y:63,transfers:1},
    {id:'s5',name:'한빛중학교',type:'class',walk:2800,transit:null,td:null,x:15,y:47,transfers:null},
    {id:'special-1',name:'푸른별학교',type:'special',walk:2450,transit:19,td:3100,x:80,y:25,transfers:1},
    {id:'s6',name:'늘봄중학교',type:'unknown',walk:3100,transit:25,td:4000,x:20,y:73,transfers:1}
  ].map(s=>({...s,district,name:`${district} ${s.name} (가상)`}));
}
function eligible(s,c){return s.type!=='special'&&(c.classType==='general'||s.type==='class');}
function metricsFor(s,c){
  const factor=c.home==='house'?1.35:c.building==='102'?({s1:2,s2:.7,s3:1.2}[s.id]||1.1):1;
  return {walk:Math.round(s.walk*factor),minutes:Math.round(s.walk*factor/63),transit:s.transit===null?null:Math.round(s.transit*factor),td:s.td===null?null:Math.round(s.td*factor),transfers:s.transfers};
}
function previewRows(c,schools){
  const r=SEOUL_RULES[c.district];
  if(conditionErrors(c).length||r.count===null||c.residence!=='yes')return [];
  const candidates=schools.filter(s=>eligible(s,c)).sort((a,b)=>metricsFor(a,c).walk-metricsFor(b,c).walk);
  if(c.parallel==='yes'){
    const special=schools.find(s=>s.id===c.specialSchool&&s.type==='special');
    return special?[special,...candidates.slice(0,r.count-1)]:[];
  }
  return candidates.slice(0,r.count);
}
