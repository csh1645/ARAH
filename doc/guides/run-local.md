# 로컬 실행 가이드

## 방법 1: 파일 바로 열기

`web/index.html`을 더블클릭해 Chrome이나 Edge로 엽니다.
빌드 과정이 없는 일반 스크립트 구조라서 그대로 실행됩니다. (첫 실행에는 인터넷 연결이 필요합니다)

## 방법 2: 로컬 서버 (태블릿에서 테스트할 때)

프로젝트 루트에서 실행합니다.

```bash
python -m http.server 8123 --directory web
```

* PC 브라우저: `http://localhost:8123`
* 같은 Wi-Fi의 태블릿: `http://<PC의 IP 주소>:8123` (Windows 방화벽에서 Python 허용이 필요할 수 있습니다)

## 저장 데이터 초기화

모은 별과 설정은 브라우저 localStorage에 `arah.` 접두어로 저장됩니다.
초기화하려면 브라우저 개발자 도구(F12) → Application → Local Storage에서 `arah.`로 시작하는 항목을 지웁니다.
