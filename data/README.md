# 데이터 관리

현재 실행용 학교 데이터·검증 사례는 들어 있지 않습니다. 아래는 개발자와 협의할 데이터 계약입니다.

| 묶음 | 최소 필드 |
|---|---|
| 학교 | school_id, official_name, school_level, district_office, address, gender_scope |
| 위치 | school_id, latitude, longitude, destination_point, source, verified_at |
| 특수학급 | school_id, school_year, special_class_status, special_class_count, source_document, source_locator |
| 규칙 | district_office, admission_year, application_type, rule_version, review_status, source_document |
| 경로 | origin_point, destination_point, route_provider, route_mode, distance_m, duration_seconds, departure_time, queried_at |
| 결과 | school_id, nearby_rank, is_guardian_preference, rule_version, review_status, manual_override_reason |

설치 상태는 confirmed / planned / unknown을 구분합니다. 실제 필드·열거값은 개발 제안이며 나이스 API 명세가 아닙니다. 거리는 m 숫자, 시간은 초 숫자로 보관하고 표시 문자열과 분리합니다. 조회 실패는 null과 상태·사유로 기록합니다.

학교 현황과 계획은 적용 학년도로 분리하고 출처와 검수일을 보존합니다. 원본값·교사 수정값도 분리합니다. 학생 성명·생년월일·장애정보는 A 탐색에 필요하지 않습니다.

Git에는 공개 가능한 학교 기준정보와 완전히 가상인 검증 사례만 저장합니다. 실주소가 포함된 학생 목록·신청서·OCR 원본은 반입하지 않습니다. `.gitignore`는 보조장치이므로 커밋 전 파일 내용을 확인합니다. 비식별 사례도 재식별 가능성이 있으면 저장소 외부에서 관리합니다.
