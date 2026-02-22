# Trading Journal - AI Powered

Professional trading journal with real-time TradingView-like charts and AI analysis.

## Project Structure

This project is organized into two main parts:

- **/frontend**: React application with Lightweight Charts integration.
- **/backend**: Express server with MongoDB, Redis, and OpenAI integration.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (default: port 27017)
- Redis running locally (default: port 6379)

### Running the Application

1. **Start the Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Server runs on [http://localhost:5001](http://localhost:5001)*

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```
   *App runs on [http://localhost:3001](http://localhost:3001)*

## Features
- Candlestick Charts (Lightweight Charts)
- Screenshot Uploads & Gallery
- AI Trade Analysis
- Risk:Reward & PnL Tracking
