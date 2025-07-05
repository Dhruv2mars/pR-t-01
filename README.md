# Tauri Chat App

A simple, standalone macOS chat application built with Tauri 2.0, React 19.1.0, and Ollama integration for local AI conversations.

## Features

- 🤖 **Local AI Chat**: Integrates with Ollama's `gemma3n:latest` model
- 💾 **Offline Storage**: SQLite database for chat history
- 🔄 **Real-time Status**: Shows Ollama connection status
- 📱 **Clean UI**: Built with React and Tailwind CSS
- 🚀 **Fast & Lightweight**: Native Tauri app (~10-20MB)

## Prerequisites

1. **Ollama**: Install Ollama and download the gemma3n model
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Download and run the gemma3n model
   ollama run gemma3n:latest
   ```

2. **Node.js & pnpm**: Install Node.js (18+) and pnpm
   ```bash
   # Install pnpm if not already installed
   npm install -g pnpm
   ```

3. **Rust**: Install Rust (required for Tauri)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

## Setup Instructions

1. **Clone and navigate to the project**:
   ```bash
   cd tauri-chat-app
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start Ollama server** (in a separate terminal):
   ```bash
   ollama run gemma3n:latest
   ```
   Keep this terminal open while using the app.

4. **Run the development server**:
   ```bash
   pnpm tauri:dev
   ```

## Building for Production

```bash
# Build the app
pnpm tauri:build

# The built app will be in src-tauri/target/release/bundle/
```

## Usage

1. **Start Ollama**: Run `ollama run gemma3n:latest` in a terminal
2. **Launch the app**: Run `pnpm tauri:dev`
3. **Create conversation**: Click "New Conversation" in the sidebar
4. **Start chatting**: Type your message and press Enter or click Send
5. **View history**: Click on previous conversations in the sidebar

## Project Structure

```
tauri-chat-app/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── ChatWindow.tsx  # Chat interface
│   │   ├── HistorySidebar.tsx  # Conversation history
│   │   └── StatusBar.tsx   # Ollama status indicator
│   ├── App.tsx             # Main app component
│   ├── types.ts            # TypeScript interfaces
│   └── main.tsx            # Entry point
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri commands
│   │   ├── db.rs           # SQLite operations
│   │   └── ollama.rs       # Ollama API integration
│   └── Cargo.toml          # Rust dependencies
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## Database Location

The SQLite database is stored at:
- **macOS**: `~/Library/Application Support/com.example.chat/chat.db`

## Troubleshooting

### "Ollama not running" error
- Make sure you've run `ollama run gemma3n:latest` in a terminal
- Check that Ollama is accessible at `http://localhost:11434`
- Verify the gemma3n model is downloaded: `ollama list`

### Build errors
- Ensure Rust is installed: `rustc --version`
- Update Rust: `rustup update`
- Clear cache: `pnpm clean` (if available) or delete `node_modules` and reinstall

### Database errors
- Check file permissions in the Application Support directory
- The app will create the database automatically on first run

## Tech Stack

- **Frontend**: React 19.1.0 + TypeScript + Tailwind CSS
- **Backend**: Tauri 2.0 + Rust
- **AI**: Ollama 0.9.5 with gemma3n:latest (4B Q4_0 model)
- **Database**: SQLite with rusqlite
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm tauri:dev

# Build for production
pnpm tauri:build

# Type checking
pnpm tsc --noEmit
```

## License

This project is for testing and educational purposes.