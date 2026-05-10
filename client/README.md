# Voter Tracking System - Client

A React-based frontend for the voter tracking system with Redux state management.

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd client
npm install
```

### Environment Variables

Create a `.env` file in the client directory:

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

Development mode:
```bash
npm start
```

Production build:
```bash
npm run build
```

## Features

- **Dashboard**: Overview of voter tracking metrics
- **Voter Filter**: Advanced filtering of voters with multiple criteria
- **Precinct Prioritization**: View precincts sorted by priority indicators
- **Canvassing Tracker**: Log and track door-knocking and phone banking activities
- **Data Export**: Export filtered voter data in multiple formats

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/         # Page components
├── redux/         # Redux store configuration
│   └── slices/    # Redux slice definitions
├── services/      # API client and services
├── App.js         # Main application component
└── index.js       # Application entry point
```

## Available Scripts

- `npm start`: Run development server
- `npm run build`: Build for production
- `npm test`: Run tests
