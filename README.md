# Freelance Hub

A web dashboard for freelancers and small agencies to find and manage freelance work. It pulls in job postings from a freelance job platform, scores them against your profile with OpenAI embeddings, helps you write cover letters and tailored CVs, and tracks leads, applicants, clients and email campaigns in one place. It also manages the content of dynamic personal-website profiles (experience, education, skills, portfolios, testimonials).

It is the frontend for [freelance-hub-api](https://github.com/anwarzonash-eng/freelance-hub-api).

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, React Aria Components, Flowbite, Lucide icons
- Apollo Client / GraphQL (job-platform API), OpenAI SDK
- `react-pdf` / `pdfjs-dist` for CV preview, Quill editor, PapaParse for CSV

## Getting started

Requirements: Node.js 18+ and a running instance of [freelance-hub-api](https://github.com/anwarzonash-eng/freelance-hub-api).

```bash
git clone https://github.com/anwarzonash-eng/freelance-hub.git
cd freelance-hub
npm install
cp .env.example .env.local     # fill in your own values
npm run dev                    # http://localhost:5000
```

Production build: `npm run build && npm start`.

## Configuration

See [.env.example](.env.example). Real keys must never be committed. Note that `NEXT_PUBLIC_*` variables are exposed to the browser; see the roadmap for moving the OpenAI calls server-side.

## Project structure

```
src/app/
  jobs/, leads/, applicants/   work pipeline screens
  clients/, professionals/     people management
  campaigns/, newsletters/     email campaigns
  main-profiles/, manage-*     profile and website content management
  api_handlers/                typed API clients for the backend
  components/                  shared UI
src/lib/                       Apollo client, job matcher
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
