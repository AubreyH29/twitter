# X — Twitter Clone (React)

A Twitter/X UI clone built as a React SPA with Vite, served via Nginx.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/feed` | Main feed |

---

## Running Locally (Development)

### Prerequisites

- Node.js 18+
- npm 9+

### Steps

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Building for Production

```bash
npm run build
```

The static output is written to `dist/`. Preview it locally with:

```bash
npm run preview
```

---

## Running with Docker

### Prerequisites

- Docker
- Docker Compose

### Build and run

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run in detached mode

```bash
docker compose up --build -d
```

### Stop

```bash
docker compose down
```

---

## Docker details

The `Dockerfile` uses a two-stage build:

1. **builder** — Node 20 Alpine: installs dependencies and runs `npm run build`
2. **serve** — Nginx Alpine: serves the `dist/` folder on port 80

The `nginx.conf` includes a `try_files` rule so React Router client-side navigation works correctly.
