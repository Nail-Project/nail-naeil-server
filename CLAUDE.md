# Claude Code 작업 지침

이 프로젝트에서 작업할 때는 `ai/` 아래의 문서를 기준으로 삼는다. 작업 종류에 맞는 문서를 먼저 확인한다.

- [ai/PROJECT.md](./ai/PROJECT.md): 서비스 범위, 기술 스택, 도메인 정책, 기능 우선순위를 확인한다.
- [ai/ARCHITECTURE.md](./ai/ARCHITECTURE.md): 폴더 구조, 계층별 책임, 요청 처리 흐름을 확인한다.
- [ai/CONVENTION.md](./ai/CONVENTION.md): 네이밍, DTO, 예외 처리, 환경 변수, Git 규칙을 확인한다.
- [ai/SKILLS.md](./ai/SKILLS.md): 구현 직전 체크리스트와 스택별 세부 규칙을 확인한다.

## 기본 원칙

- P0 기능을 우선으로 구현하고 P1 기능도 기본 개발 범위에 포함한다. P2 기능은 별도 요청이나 합의가 없으면 구현하지 않는다.
- 새 코드는 `ai/ARCHITECTURE.md`와 `ai/CONVENTION.md`를 따른다.
- 기존 코드와 문서에서 확인되지 않은 구조, 패턴, 의존성을 임의로 도입하지 않는다.
- 새 의존성이 필요하거나 요구사항이 불분명하면 구현 전에 확인한다.
- 구현 직전에 `ai/SKILLS.md`의 체크리스트를 확인한다.
