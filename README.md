# Honeypot Scam Defendor 🛡️🤖

An AI-powered honeypot system designed to engage with and analyze scammers in real-time. This project uses multiple personas to trap scammers, extract intelligence, and generate evidence for cybersecurity teams.

## 🚀 Features

- **Multi-Persona AI**: Choose between different personas (Cautious Alex, Trusting Grandma Betty, Skeptical SysAdmin Dave) to engage scammers effectively.
- **Real-time Dashboard**: Monitor active scam threads, threat levels, and geographical origins.
- **Intelligence Extraction**: Automatically identifies and redacts sensitive information while extracting scammer tactics.
- **Evidence Locker**: Generates comprehensive PDF and JSON reports for reporting to cybersecurity departments.
- **Responsive Web App**: A modern, Cyber-themed UI built with React, Vite, and Tailwind CSS.

## 🏗️ Architecture

- **frontend/**: A Vite-powered React application providing the user interface and dashboard metrics.
- **backend/**: Handles the AI logic, persona management, and core scam analysis routines.
- **PWA Support**: Can be installed as a Progressive Web App for a native-like experience on desktop and mobile.

## 🛠️ Setup & Running

### Requirements
- Python 3.x
- Node.js & npm

### Quickly Start the Application
Run the provided batch script to start both the backend and frontend components:
```bash
./start_app.bat
```

### Manual Setup
1. **Backend**:
   ```bash
   pip install -r requirements.txt
   python main.py
   ```
2. **Frontend**:
   ```bash
   cd web-app
   npm install
   npm run dev
   ```

## 📜 License
This project is licensed under the MIT License.
