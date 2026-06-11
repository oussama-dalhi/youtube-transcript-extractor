# YouTube Transcript Extractor

A web application that extracts transcripts from YouTube videos using FastAPI.

Users can paste a YouTube URL into the interface and retrieve the video's transcript instantly.

## Features

- Extract transcripts from YouTube videos
- Validate YouTube URLs
- FastAPI REST API
- Simple frontend built with HTML, CSS, and JavaScript
- JSON-based communication between frontend and backend
- Error handling for invalid videos and unavailable transcripts

## Technologies Used

### Backend
- Python
- FastAPI
- Pydantic
- YouTube Transcript API

### Frontend
- HTML
- CSS
- JavaScript
- Fetch API
## Preview
![alt text](app/assets/image.png)
## Project Structure

```text
youtube-transcript-extractor/
│
├── app/
│   ├── static/
│   │   ├── style.css
│   │   └── script.js
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

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

Successful Response:

```json
{
  "success": true,
  "video_id": "dQw4w9WgXcQ",
  "transcript": "..."
}
```

Error Response:

```json
{
  "success": false,
  "error": "Could not retrieve transcript"
}
```

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/youtube-transcript-extractor.git
cd youtube-transcript-extractor
```

Create a virtual environment:

```bash
py -m venv .venv
```

Activate it:

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the server:

```bash
py -m uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000
```

## What I Learned

Through this project I learned:

- Building REST APIs with FastAPI
- Request validation using Pydantic
- Working with JSON requests and responses
- Connecting a frontend to a backend using Fetch API
- Handling CORS configuration
- Organizing a Python web application

## Future Improvements

- Download transcripts as TXT files
- Support multiple transcript languages
- Copy transcript to clipboard
- Transcript summarization using AI
- Better UI and loading indicators

## License

This project is for educational and portfolio purposes.