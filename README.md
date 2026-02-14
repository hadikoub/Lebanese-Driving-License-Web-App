# Arabic QCM Driving Test App

## Features
- Arabic-first web app with RTL layout.
- Admin-only review/editor screen for correcting question text and answers.
- Practice mode with immediate feedback.
- Exam mode with final score and detailed review.
- Quiz setup for both practice/exam:
  - question count (default 30)
  - category filter
  - type selector (`mixed` or single type)
  - timer settings
- Questions are always shuffled in practice and exam.
- Story mode with progressive levels that cover all questions (up to 30 per level) and saved progress.
- Local JSON import/export (no backend).
- CLI converters to generate questions from CSV or PDF.

## Requirements
- Node.js 20+
- Tesseract with Arabic language pack (`ara`)
- macOS `sips` command (used by OCR fallback pipeline)

## Install
```bash
npm install
```

## Run app
```bash
npm run dev
```

## Multi-user handling
- Dynamic data is profile-scoped in browser storage (results, story progress, admin state, edited set).
- Use the top-bar profile selector to switch users.
- Use `ملف جديد` to create a separate local profile on the same device/browser.

## Admin mode
- Open `/admin`
- First use: create your own passcode (no default passcode exists)

## Generate question set from CSV (recommended)
Default CSV path:
- `/Users/hadikoub/Documents/driving-test/answers-driving-exams-parsed.csv`

Run converter:
```bash
npm run extract:qcm:csv
```

Custom CSV path:
```bash
npm run extract:qcm:csv -- /absolute/path/to/questions.csv
```

## Generate question set from PDF (fallback)
Default PDF path:
- `/Users/hadikoub/Downloads/exam-questions.pdf`

Run extractor:
```bash
npm run extract:qcm:download
```

Custom PDF path:
```bash
npm run extract:qcm -- /absolute/path/to/file.pdf
```

Outputs:
- `/Users/hadikoub/Documents/driving-test/data/questions.ar.generated.json`
- `/Users/hadikoub/Documents/driving-test/data/extraction-report.json`
- `/Users/hadikoub/Documents/driving-test/public/data/questions.ar.generated.json`

## Tests
```bash
npm test
```
