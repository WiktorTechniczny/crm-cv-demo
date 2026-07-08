# CRM Rekrutacje - public preview

Public preview of the CRM recruitment workflow used in the Fullstack Studio portfolio.

This repo is intentionally frontend-only. It uses neutral seeded data and must not connect to the production CRM database, Supabase storage, portal sessions, Chrome profiles or real CV documents.

## Commands

```powershell
npm install
npm run dev
npm run build
```

## Safety rules

- Keep `VITE_DEMO_MODE=true` for public deploys.
- Do not copy `.env`, `.vercel`, `storage`, `.portal-sessions`, `.portal-rpa-debug`, `.logs`, backups or real documents.
- Use only neutral candidates, companies, phone numbers, emails, notes and documents.
