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
- Dynamic data (results, story progress, admin state, edited set) is stored in browser `localStorage`.
- On the public web, each visitor has isolated local data in their own browser/device.
- No backend database is used in the current version.

## Deploy to DigitalOcean App Platform (via GitHub)
This repo is ready with an App Spec file:
- `.do/app.yaml`

Before first deploy:
1. Push this project to a GitHub repo.
2. If you deploy from a different repository, update `github.repo` in `.do/app.yaml`.
3. Commit and push.

Deploy options:
1. DigitalOcean UI:
   - App Platform -> Create App -> GitHub -> select repo/branch.
   - Choose "Use App Spec" if prompted.
2. `doctl` CLI:
```bash
doctl apps create --spec .do/app.yaml
```

Notes:
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- SPA routing is enabled with `catchall_document: index.html`, so routes like `/quiz/exam` work after refresh.

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
