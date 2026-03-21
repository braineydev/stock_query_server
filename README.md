# SQS GMN - Queue Management System

A full-stack application for managing SQS-like message queues with data structures implementations.

## Project Structure

```
sqsgmn/
├── backend/                  # Python Flask API
│   ├── app.py                # Main Flask application & routes
│   ├── data_structures.py    # HashMap, Stack, Queue, Deque, Heap implementations
│   ├── auth.py               # JWT authentication logic
│   ├── alerts.py             # Alert processing logic
│   └── requirements.txt
│
└── frontend/                 # React Application
    ├── public/
    ├── src/
    │   ├── components/       # Reusable UI (Navbar, Sidebar, Cards, Charts)
    │   ├── pages/            # Dashboard, Ingestion, Query, Analytics, etc.
    │   ├── services/         # Axios API calls (api.js)
    │   ├── context/          # React Context for Auth & User Role State
    │   ├── App.jsx           # Main router
    │   └── index.css         # Tailwind directives
    ├── package.json
    └── tailwind.config.js
```

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The backend will run on `http://localhost:5000`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- **Data Structures**: Custom implementations of HashMap, Stack, Queue, Deque, and MinHeap
- **Authentication**: JWT-based authentication system
- **Message Management**: Ingest, query, and manage messages
- **Alert System**: Process and track alerts
- **Analytics**: Visualize message traffic and metrics
- **Responsive UI**: Built with React and Tailwind CSS

## Technologies

### Backend

- Python 3.x
- Flask
- PyJWT
- Flask-CORS

### Frontend

- React 18
- React Router
- Axios
- Recharts
- Tailwind CSS
- Vite

## License

MIT
>>>>>>> 12e4fe2 (Initial commit from local workspace)
