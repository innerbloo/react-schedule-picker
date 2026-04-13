# Analysis: 글로벌 로케일 지원

- **Feature**: locale-support
- **Date**: 2026-04-13
- **Mode**: Static-only (UI 라이브러리, runtime 테스트 불가)

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | drop-in 글로벌 지원, 사용자 번역 테이블 직접 작성 마찰 제거 |
| **WHO** | 한/일/중/영어권 제품 프론트엔드 개발자 + 각 문화권 최종 사용자 |
| **RISK** | breaking 위험, 주말 CSS 회귀, locale 해석 혼란 |
| **SUCCESS** | SC1~SC6 (locale 1줄 적용, 오버라이드 유지, 번들 ≤ 30KB 상향) |
| **SCOPE** | 6 locales, 4 props, CSS 정리, 예제/README. RTL·중동·동적 API 제외 |

## Match Rate

| 축 | 점수 |
|----|:----:|
| Structural | 83.3% |
| Functional | 97.5% |
| Contract | 100% |
| **Overall (static)** | **95.7%** ✅ |

공식: `Structural×0.2 + Functional×0.4 + Contract×0.4 = 16.66 + 39.00 + 40.00 = 95.66%`

## Success Criteria

| SC | 상태 | 근거 |
|----|:----:|------|
| SC1 locale="ko" → 한국어 + 주말색 | ✅ | `locales.ts:128-138` ko preset, `SchedulePicker.tsx:376,433` 인라인 style |
| SC2 locale="en-US" → 일요일 시작 + 12h | ✅ | `locales.ts:117-127` weekStartsOn+formatHour, rotateDays 호출 |
| SC3 messages 부분 override | ✅ | `locales.ts:187-194` merge 로직 |
| SC4 locale 미지정 시 v1.0.0 호환 | ⚠️ Partial | 주말색 `V1_COMPAT_WEEKEND` 유지 ✅. 자동화된 스냅샷 테스트 없음, v1.0.0 `getHourLabel` 로직 회귀 여부 미확인 |
| SC5 typecheck + build 통과 | ✅ | 실측 통과 |
| SC6 dist ≤ 30KB | ✅ | 실측 29.13KB |

**Success Rate**: 5/6 Met + 1 Partial

## Gaps

### Critical
- **C1** `example/main.tsx:154` — `EN_LABELS` 미정의 참조. 브라우저 실행 시 `ReferenceError`, 시각 검증 blocker.

### Important
- **I1** `SchedulePicker.tsx:73-80 getHourLabel` — `formatHour` prop 명시 시 showAllHours 분기 bypass. v1.0.0 대비 회귀 가능성 재확인 필요.
- **I2** `constants.ts:26` `DEFAULT_PRESETS` — `@deprecated` JSDoc 누락. Plan Appendix 결정사항 미반영.
- **I3** `SchedulePicker.tsx:267-273 getDayLabelClass` — `--sat`/`--sun` 클래스만 붙음. `weekendHighlight={{fri:...}}` 커스텀 use case에서 CSS 클래스 표현력 제한. README 예시와 실제 API 불일치.

### Minor
- M1 `PRESET_LABELS as const` vs `V1_COMPAT_WEEKEND: Record<string,string>` 타입 스타일 불일치
- M2 README ko row에 "blue/red" 영어 표기
- M3 (구현이 Design보다 정확 — 기록만)
- M4 `locales.ts:185` 과잉 fallback
- M5 예제에서 `resolveLocaleConfig` 중복 호출 — 성능 이슈 아님, API 개선 여지

## Decision Record Verification

| Decision | 반영 |
|----------|:----:|
| Option C 아키텍처 (flat locales.ts) | ✅ |
| Design §9.1 v1 호환 주말색 | ✅ |
| rotateDays를 locales.ts에 둠 | ✅ |
| 우선순위 props > messages > preset | ✅ |
| `@deprecated` JSDoc (Plan Appendix) | ❌ I2 |
| weekendHighlight shape 결정 | ✅ |
| 12h corner cases | ✅ |

## Runtime Verification

N/A (UI 라이브러리, 서버 없음). 수동 시각 확인 필요하나 Critical C1 blocker로 현재 불가능.

## 결론

Overall 95.7%로 **quality gate 90% 충족**. 다만 C1이 수동 검증을 막아 "엄밀한 완료"는 아님. C1 1줄 수정 후 수동 확인 권장.
