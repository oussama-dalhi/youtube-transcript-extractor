# YouTube Transcript Extractor

A full-stack web application that extracts transcripts from YouTube videos using FastAPI.

Users can paste a YouTube video URL into the interface and retrieve the video's transcript in seconds.

## Features

* Extract transcripts from YouTube videos
* Validate YouTube URLs
* FastAPI REST API
* Simple frontend built with HTML, CSS, and JavaScript
* JSON-based communication between frontend and backend
* Error handling for invalid videos and unavailable transcripts

## Technologies Used

### Backend

* Python
* FastAPI
* Pydantic
* YouTube Transcript API

### Frontend

* HTML
* CSS
* JavaScript
* Fetch API

## Preview

```md
![Application Preview](app/assets/image.png)
```

## How It Works

The application follows a simple client-server architecture:

```text
User
 │
 ▼
Paste YouTube URL
 │
 ▼
Frontend (HTML/CSS/JavaScript)
 │
 ▼
POST /transcript
 │
 ▼
FastAPI Backend
 │
 ▼
Extract Video ID
 │
 ▼
YouTube Transcript API
 │
 ▼
Retrieve Transcript
 │
 ▼
Return JSON Response
 │
 ▼
Display Transcript
```

### Example Flow

1. The user enters a YouTube URL.
2. JavaScript sends a POST request to the FastAPI backend.
3. The backend extracts the YouTube video ID.
4. The backend requests the transcript from YouTube.
5. Transcript segments are combined into a single string.
6. The transcript is returned as JSON.
7. The frontend displays the transcript.

## Project Structure

```text
youtube-transcript-extractor/
│
├── app/
│   ├── static/
│   │   ├── css/style.css
│   │   └── js/script.js
│   │
│   ├── templates/
│   │   └── index.html
│   │
│   ├── main.py
│   └── transcript.py
│
├── requirements.txt
└── README.md
```

## API Endpoint

### Extract Transcript

```http
POST /transcript
```

### Request

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Successful Response

```json
{
  "success": true,
  "video_id": "dQw4w9WgXcQ",
  "transcript": "..."
}
```

### Error Response

```json
{
  "success": false,
  "error": "Could not retrieve transcript"
}
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/youtube-transcript-extractor.git
cd youtube-transcript-extractor
```

### 2. Create a Virtual Environment

#### Windows

```bash
py -m venv .venv
```

#### Git Bash / Linux / macOS

```bash
python -m venv .venv
```

### 3. Activate the Virtual Environment

#### Windows CMD

```bash
.venv\Scripts\activate.bat
```

#### Windows PowerShell

```bash
.venv\Scripts\Activate.ps1
```

#### Git Bash

```bash
source .venv/Scripts/activate
```

#### Linux / macOS

```bash
source .venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Application

### Start the FastAPI Server

#### Windows

```bash
py -m fastapi dev app/main.py
```

or

```bash
py -m uvicorn app.main:app --reload
```

#### Git Bash / Linux / macOS

```bash
python -m fastapi dev app/main.py
```

or

```bash
python -m uvicorn app.main:app --reload
```

### Open the Application

```text
http://127.0.0.1:8000
```

### API Documentation

FastAPI automatically generates interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

## What I Learned

Through this project I learned:

* Building REST APIs with FastAPI
* Request validation using Pydantic
* Working with JSON requests and responses
* Connecting a frontend to a backend using Fetch API
* Handling CORS configuration
* Organizing a Python web application
* Integrating third-party Python libraries
* Error handling and API design

## Future Improvements

* Download transcripts as TXT files
* Support multiple transcript languages
* Copy transcript to clipboard
* Display video title and thumbnail
* Transcript summarization using AI
* Better UI and loading indicators

## License

This project was built for educational and portfolio purposes.
