# YouTube Transcript Extractor
#### Video Demo: <URL HERE>
#### Description:

This is my final project for CS50x.

- **Live application:** https://transcript.oussama-dalhi.dev/
- **GitHub repository:** https://github.com/oussama-dalhi/youtube-transcript-extractor

YouTube Transcript Extractor is a web app and a tool that I built so that I, and the people who use it, can retrieve the transcript of a YouTube video by providing its URL as input. It supports English, German, and Arabic transcripts, including automatically generated captions when available.

I made it purposefully easy to use, with a simple UI and without ads or complicated tools, so that anyone can use it easily, including me, my family and hopefully some other people soon. You just put the YouTube video URL in the input and then you get a transcript for it that you can easily copy and save. This web app can be especially helpful for studying, language learning, and saving the transcripts of favorite programming lessons.

I designed it to work for both guests and registered users. Anyone can extract a transcript without creating an account. However, registered users get one important additional functionality: their successfully extracted transcripts are automatically saved to their personal history, with the date when they made them, where they can revisit or delete them later.

The backend is written in Python with FastAPI, and the frontend is plain HTML, CSS and JavaScript. Users and their history are stored in PostgreSQL (hosted on Neon), I access it using Psycopg 3 and raw SQL. The transcripts come from TranscriptAPI, and the app itself is hosted on FastAPI Cloud.

![Application preview](app/assets/showcase.png)

## Features

- **YouTube transcript extraction:** submit a YouTube video URL and retrieve its available transcript.
- **Multiple languages:** supports English, German, and Arabic transcripts, including auto-generated captions when available.
- **Guest access:** transcript extraction does not require registration or login.
- **User authentication:** users can register, log in, and log out.
- **Personal transcript history:** the transcripts of logged-in users are automatically saved to their history, with the date.
- **History management:** you can browse your saved transcripts, open them again, and delete the ones you don't want.
- **Copy to clipboard:** copy the extracted transcript with one click.
- **24-hour caching:** repeated requests for the same video can use cached results instead of making another external API request.
- **Rate limiting:** limits requests to 10 per minute per IP address to reduce abuse and control API usage.
- **Responsive interface:** the layout adapts to different screen sizes, including mobile devices.
- **Error handling:** gives understandable feedback for invalid URLs, unavailable transcripts, rate limits, wrong username or password, and external service errors.

## How it works

1. When the page loads, the JavaScript asks the server (`GET /auth/me`) if someone is logged in and loads their transcripts history to the side menu.
2. When a link is submitted, the browser sends a POST request to `/transcript`. FastAPI checks the request with Pydantic, applies the rate limit, and looks in the in-memory cache.
3. If the video is not in the cache, the server asks TranscriptAPI for it. I join the caption segments into one text, clean it (for example I remove tags like `[music]`), take the video title, and keep the result in the cache.
4. If the user is logged in, the transcript is also saved in PostgreSQL for that user. The server answers with JSON that has the title, the transcript and a `saved`  flag indicating whether the save succeeded, and the page updates the history side bar.
5. Clicking an old transcript in the history loads the saved text from my database, so it does not use the external API again.

## Authentication and database

I used PostgreSQL because the app has to remember users and saved transcripts even after the server restarts. The cache lives in memory and disappears on a restart, but the database does not. There are two tables:

- **users:** id, name, username, password hash and creation time. Usernames are unique and always lowercase.
- **saved_transcripts:** id, user_id, video URL, title, transcript text and creation time. Each transcript belongs to a user through a foreign key with `ON DELETE CASCADE`, so deleting a user also deletes their transcripts.

The database also has a few rules of its own: text columns cannot be empty, and an index on `(user_id, created_at DESC, id DESC)` makes the history list fast. The whole structure is in `schema.sql`.

For passwords they are never stored as plain text. I used `pwdlib` with Argon2id to hash them and to check login attempts. Logging in gives the same error for a wrong username and a wrong password, and it still checks a dummy hash when the username does not exist, so the response time does not show which usernames exist. Passwords are not silently trimmed or normalized before hashing, so leading and trailing spaces remain part of the password.

For sessions I use signed cookies from Starlette's `SessionMiddleware`. The cookie only holds the user's id, and it is `HttpOnly` and `SameSite=Lax`. Every history query checks the transcript id together with the user id from the session, never an id from the request, so users can only see their own transcripts. Someone else's transcript gives the same "not found" as one that does not exist.

I wrote the SQL myself with Psycopg 3 and a connection pool instead of using an ORM. I wanted to understand queries, relationships, constraints and indexes, and also I didn't think that the SQL queries will be so complex for this app.

## Design decisions

- **FastAPI instead of Flask.** In the course we used Flask, but I wanted automatic input validation and automatic API documentation without writing them myself. With FastAPI I describe what each route accepts with Pydantic, and bad input is rejected before my code runs. It also made it easier to keep the routes separate from the transcript code.
- **A transcript API instead of a library.** At first I tried to get the transcripts directly from YouTube with the `youtube-transcript-api` library. It worked on my computer, but after deploying, YouTube blocked the requests because they came from a data-center IP address. So I switched to TranscriptAPI. The price is that I need an API key and have a limited number of credits, and this is why I added caching and rate limiting.
- **Caching.** Every request to TranscriptAPI uses credits, so a 24-hour cache (500 entries) avoids additional TranscriptAPI credits for repeated requests and provudes faster transcript load. The downsides are that the cache is cleared when the server restarts, and that two different links to the same video are cached separately.
- **Rate limiting.** 10 transcripts per minute per IP, and 5 login attempts per minute, to protect my credits and to make password guessing harder.
- **Login is optional.** I did not want to force people to sign up just to get a transcript, so accounts only add the history functionality.
- **PostgreSQL instead of SQLite.** In the course we used SQLite, but my app runs on a hosted server where files on the disk may not be kept, so I used a real database server. It needs more setup, so I added `schema.sql` and explained the steps in this README.
- **Username and password only.** Asking for an email would mean verification and password reset, which I did not want to build. The downside is that a forgotten password cannot be recovered.
- **Cookie sessions instead of JWT.** A signed cookie is simple and similar to the Flask sessions from the course. The downside is that a copied cookie stays valid until it expires after 14 days.
- **Saving the full text.** Opening an old transcript costs no API credit. The history list only loads the title, link and date, so it stays light.
- **History must not break the main feature.** If saving fails, I log the error and the user still gets the transcript.
- **Plain JavaScript.** One page does not need a framework or a build step. Text from the server, like video titles, is always added to the page as text and never as HTML.

## Challenges I ran into

- **Deploying.** Everything worked locally, but YouTube blocked the server (see above), and later my first deployment with accounts crashed because FastAPI Cloud installs packages from `pyproject.toml` and I had only added the new ones to `requirements.txt`.
- **Controlling API usage.** Every unnecessary request costs credits, so I added the TTL cache and the per-IP limits.
- **Consistent errors.** Problems can come from my validation, from missing captions, or from the external API. I made one `TranscriptError` with a status code and one handler, so the frontend always receives `{"detail": "..."}` and can show a useful message.
- **Authentication.** I had to validate the forms, clean the usernames, hash the passwords safely, keep the session between requests, and make sure users can only reach their own data.
- **The frontend feeling right.** Errors had to stay separate from the transcript, the button had to work again after a failed request, long transcripts needed a readable layout, and on phones the footer links stayed highlighted after a tap, so hover effects now only apply on devices that can hover.

## Project structure

```text
youtube-transcript-extractor/
├── app/
│   ├── assets/
│   │   └── showcase.png
│   ├── db/
│   │   ├── __init__.py
│   │   └── connection.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── history.py
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   └── script.js
│   │   └── favicon.svg
│   ├── templates/
│   │   └── index.html
│   ├── limiter.py
│   ├── main.py
│   └── transcript.py
├── schema.sql
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
└── README.md
```

### What each file does

- `app/main.py` creates the FastAPI app. It opens and closes the database pool, sets up the session cookies, includes the routes, serves the page and the static files, handles errors, and contains the `/transcript` route, including saving to the history.
- `app/transcript.py` is the only file that talks to TranscriptAPI. It has the cache, the cleaning of the text, the title extraction, and the conversion of API problems into clear errors with the right status codes.
- `app/limiter.py` has the rate limiter. It is its own file so that `main.py` and the route files can all import it without a circular import.
- `app/db/connection.py` creates the PostgreSQL connection pool from the `DATABASE_URL` setting.
- `app/routes/auth.py` has register, login, logout and "who am I", plus the models that validate what users send.
- `app/routes/history.py` has the routes to list, open and delete saved transcripts.
- `app/templates/index.html` is the one page of the app and `app/static/css/style.css` is its design. `app/static/js/script.js` is everything that happens in the browser: the form, the login and register forms, the side menu and the copy button. `app/static/favicon.svg` is the icon and `app/assets/showcase.png` is the screenshot used in this README.
- `schema.sql` creates the database tables. `requirements.txt` is for installing locally and `pyproject.toml` is what the deployment uses. `.env.example` shows which settings are needed.

## Running it locally

You need Python 3.10 or newer, PostgreSQL, and a TranscriptAPI key from [transcriptapi.com](https://transcriptapi.com/).

1. Clone the repository and go into the folder:
   ```bash
   git clone https://github.com/oussama-dalhi/youtube-transcript-extractor.git
   cd youtube-transcript-extractor
   ```
2. Create and activate a virtual environment, then install the dependencies:
   ```bash
   python -m venv .venv
   
   # Linux / macOS
   source .venv/bin/activate

   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1

   # Windows CMD
   .venv\Scripts\activate.bat

   pip install -r requirements.txt
   ```
3. Create a PostgreSQL user and database, then load the tables:
   ```bash
   # 1. Create the database user
   psql -U postgres -c "CREATE ROLE transcript_app LOGIN PASSWORD 'choose-a-password';"

   # 2. Create the database
   psql -U postgres -c "CREATE DATABASE transcripts OWNER transcript_app;"

   # 3. Create the tables and indexes
   psql -U transcript_app -d transcripts -f schema.sql
   ```
4. Copy `.env.example` to `.env` and fill it in:
   ```dotenv
   TRANSCRIPT_API_KEY=your_transcriptapi_key
   DATABASE_URL=postgresql://transcript_app:choose-a-password@localhost:5432/transcripts
   SESSION_SECRET=your_random_secret_key
   ```
   You can generate the secret with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
5. Start the server and open http://127.0.0.1:8000:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   (`fastapi dev app/main.py` works too.) The automatic API documentation is at http://127.0.0.1:8000/docs.

## Deployment

The app is hosted on FastAPI Cloud and the production database is on Neon, a hosted PostgreSQL service, so the data survives restarts and redeploys. The secrets (`TRANSCRIPT_API_KEY`, `DATABASE_URL` and `SESSION_SECRET`) are set in the FastAPI Cloud environment and not in the repository, and `.env` is ignored by Git. On the live site `APP_ENV=production` makes the session cookie `Secure`. The GitHub repository is connected, so pushing to the main branch deploys a new version. Because FastAPI Cloud installs from `pyproject.toml`, every new package has to be added there as well as in `requirements.txt`.

## Limitations and future ideas

- The app depends on TranscriptAPI, so what I can get depends on the service and on my credits, and a transcript only exists if the video has captions.
- The cache and the rate limits are kept in memory, so they reset when the app restarts and are not shared between several instances.
- There is no password reset, and I have no automated tests yet.
- Ideas for later: downloading a transcript as a text file, optional timestamps, search and filters in the history, video thumbnails, an AI summary, and tests for the login and history routes.

## Use of AI

As the CS50 final project rules allow, I used AI tools as helpers, and I mention this in comments in my code. I used Claude (Anthropic) to talk through design options, to review my code and find bugs, and to help draft some parts of the project, like some of the CSS and JavaScript, the caching code and the first versions of this README. I designed the app, created the database, and wrote the database connection, login and history code myself, using that feedback to fix my mistakes.

Built by Oussama Dalhi ([oussama-dalhi](https://github.com/oussama-dalhi)) as my CS50x 2026 final project.