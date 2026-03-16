# Planning Poker

A real-time planning poker application for agile teams to estimate story points collaboratively. Built with React, PatternFly, and Firebase.

## Features

- 🎴 Fibonacci sequence voting (1, 2, 3, 5, 8, 13, 21, 40, 100)
- 👥 Real-time collaboration with live participant status
- 🔒 Simple room code-based sessions (no authentication required)
- 📊 Automatic vote averaging and results display
- 🎯 Moderator controls for managing voting sessions
- 🎨 Clean UI with PatternFly design system

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Realtime Database in your Firebase project
3. Set database rules to allow public read/write (for development):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
4. Copy `.env.example` to `.env`
5. Fill in your Firebase configuration values in `.env`

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to view the app.

## Deployment

### Deploy to GitHub Pages

1. Update the `base` path in `vite.config.js` to match your repository name
2. Run the deployment command:
   ```bash
   npm run deploy
   ```
3. Enable GitHub Pages in your repository settings (select `gh-pages` branch)

## How to Use

### Creating a Session

1. Enter your name and session name
2. Click "Create Session"
3. Share the room code with your team

### Joining a Session

1. Enter your name and the room code
2. Click "Join Session"

### Voting

1. Select a Fibonacci value to cast your vote
2. Wait for all participants to vote
3. Moderator reveals votes when ready
4. View results and average estimate
5. Clear votes and move to next issue

## Tech Stack

- **React 18** - UI framework
- **PatternFly** - Design system and component library
- **Firebase Realtime Database** - Real-time data synchronization
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server

## License

ISC
