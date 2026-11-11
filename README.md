# CDAC Kharghar – Task Manager

A simple, interactive mini project for the **Docker → GitHub → AWS ECS Express / GCP Cloud Run** session.
Built with **Python (Flask) + HTML + CSS + JavaScript**.

## Features

- Kanban **board** (To Do / In Progress / Done) with **drag & drop**, plus a **list** view
- Add, edit, delete tasks with priority, status and due date (quick "Today / Tomorrow / Next week" buttons)
- Search, priority filters, live stats and a progress ring
- Confetti when a task is completed, **Undo** after delete
- Profile with avatar picker, dark / light theme
- Keyboard shortcuts: `N` new task · `/` search · `V` switch view · `T` theme · `Esc` close
- **Export / Import** backup of your data as a JSON file

## How data is stored

All data (tasks, profile, theme) is saved in the **browser's localStorage**.

- No database, nothing to configure
- Survives page refresh, browser restart, and container redeploys
- Each student sees only their own data (per browser, per device)
- Clearing browser data wipes it - use Export to keep a backup

The Flask server only serves the page and a `/health` endpoint.

## Project structure

```
cdac-kharghar-taskmanager/
├── app.py                 # Flask app (serves page + /health)
├── requirements.txt       # Python dependencies (Flask, gunicorn)
├── .gitignore
├── README.md
├── DOCKER_CHEATSHEET.md
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    ├── js/app.js          # all app logic + localStorage
    └── img/
        ├── cdac-logo.svg  # placeholder logo
        └── cdac-logo.png  # <-- add the official CDAC logo here (optional)
```

## Run locally (without Docker)

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate        Mac/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python app.py
# open http://localhost:8080
```

## Logo

Save the official logo as `static/img/cdac-logo.png`. The page loads the PNG first
and falls back to the SVG placeholder if it is missing.

## What the Dockerfile must handle (for the session)

| Topic | Detail |
|-------|--------|
| Base image | `python:3.12-slim` |
| Dependencies | Copy `requirements.txt` first, run `pip install --no-cache-dir -r requirements.txt`, then copy the rest (layer caching) |
| Port | App reads the `PORT` env var, default **8080** (Cloud Run sets it) |
| Start command | Production server: `gunicorn --bind 0.0.0.0:$PORT app:app` (use shell form so `$PORT` expands) |
| Health check | `GET /health` returns `{"status":"ok"}` |
| Ignore files | Write a `.dockerignore` (`.venv`, `__pycache__`, `.git`, `README.md`) |

```bash
docker build -t cdac-taskmanager .
docker run -p 8080:8080 cdac-taskmanager
```

## Session flow

1. Run the app locally and explore it
2. Write the `Dockerfile` and `.dockerignore`
3. Build and run the image locally
4. Push the project to GitHub
5. Push the image to Amazon ECR, then deploy on **ECS Express Mode**
6. Push the image to Artifact Registry, then deploy on **Cloud Run**
