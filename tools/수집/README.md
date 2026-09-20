# 관할별 공고 수집·추출 도구

서울 11개 교육지원청의 「중학교 입학 특수교육대상자 선정·배치 계획」 원문을 내려받아 본문 텍스트까지 뽑는 스크립트다. 2026-09-20 서울 전 관할 1회 실행에 실제로 쓴 것이다.

**원본은 저장소에 두지 않는다.** 배포 원본(HWP/PDF/XLSX)은 커밋하지 않는 것이 저장소 원칙이다([CLAUDE.md](../../CLAUDE.md) §10). 다른 기기에서는 아래 순서로 **다시 내려받는다.**

## 준비

```bash
python3 -m pip install olefile pypdf openpyxl
export NOTICE_DIR="$HOME/Desktop/특수교육맵서비스/공고원문_2027중입"   # 원본을 둘 폴더
```

`NOTICE_DIR`을 지정하지 않으면 위 기본값을 쓴다. 표준 라이브러리만 쓰는 스크립트(1·3·4)는 설치 없이도 돈다.

## 순서

| # | 스크립트 | 하는 일 | 필요 |
|---|---|---|---|
| 1 | `1_게시물목록_수집.py` | 11개 관할 게시판을 훑어 `2027` 제목 게시물 목록을 만든다 → `posts.json` | 표준 |
| 2 | `2_첨부_다운로드.py` | 목록에서 고른 게시물의 첨부를 `$NOTICE_DIR/{관할}/`에 내려받고 해시를 기록 | 표준 |
| 3 | `3_hwp_OLE리더.py` | HWP의 OLE 스트림 목록과 `PrvText`(미리보기)를 본다. **판본 대조용** | 표준 |
| 4 | `4_hwp_본문추출.py` | HWP 본문을 텍스트로 뽑는다. `python3 4_hwp_본문추출.py <파일>` | `olefile` |
| 5 | `5_본문일괄추출.py` | `$NOTICE_DIR` 전체를 훑어 HWP·PDF 본문을 `본문/`에 저장 | `olefile`, `pypdf` |

2번의 대상 게시물 번호(`board_seq`)는 스크립트 안 `TARGETS`에 박혀 있다. **학년도가 바뀌면 1번을 먼저 돌려 새 번호로 갈아야 한다.**

## 게시처가 두 갈래다

10개 관할은 시교육청 특수교육센터의 같은 게시판 구조를 쓴다.

```
목록  POST https://sedu.sen.go.kr/{slug}/board/boardList.do
      board_type_cd=notice|pds & branch_cd={slug} & pageIndex & searchCondition=title & searchKeyword
상세  POST https://sedu.sen.go.kr/{slug}/board/boardView.do
      board_type_cd & branch_cd & board_seq
첨부  POST https://sedu.sen.go.kr/fileDownload.do
      attach_file_id (상세 페이지 hidden) & file_seq
```

| 관할 | slug | 관할 | slug |
|---|---|---|---|
| 동부 | `dongbu` | 강남서초 | `gangnam` |
| 서부 | `seobu` | 강동송파 | `gangdong` |
| 남부 | `nambu` | 강서양천 | `gangseo` |
| 북부 | `bukbu` | 성동광진 | `seongdong` |
| 중부 | `jungbu` | 성북강북 | `sensb` |
| 동작관악 | `dongjak` | | |

**성동광진만 예외다.** 이 게시판에 중학교 계획을 올리지 않고 교육지원청 본 사이트 「알림마당」에 게시한다. 첨부는 정적 경로에 있어 URL 인코딩해서 직접 받는다.

```
https://sdgjedu.sen.go.kr/CMS/admserv/admserv01/__icsFiles/afieldfile/{YYYY}/{MM}/{DD}/{파일명}
```

여러 관할이 2026년 8~9월에 센터 홈페이지 통폐합을 공지했다. **URL 패턴은 재확인 주기가 필요하다.**

## 수집대장.json

확보한 21개 파일의 출처·게시일·파일 해시 기록이다. 개인정보 항목은 없다. 사람이 읽는 정리본은 [수집 대장](../../docs/research/2027중입_관할별공고_수집대장.md), 조항 대조 결과는 [배치조건 대조표](../../docs/research/2027중입_관할별_배치조건_대조표.md)에 있다.

**원본을 다시 받았으면 해시를 대조해라.** 2026-09-20에 실제로 강동송파 파일이 재배포본으로 바뀐 것을 해시 대조로 발견했다.

## 주의

- 과도한 요청을 보내지 않는다. 스크립트에 요청 간 대기가 들어 있다.
- 자동 수집의 이용조건 적법성은 **운영 전** 확인한다. 이번 실행은 조사 목적 1회 수동 실행이다.
- 명단 서식(XLS/XLSX)은 빈 서식이지만 **작성자명이 파일 메타데이터에 남아 있는 사례**가 있었다. 저장소에 반입하지 않는다.
