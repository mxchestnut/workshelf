# Work Shelf Frontend

React + Vite frontend for the Work Shelf platform.

## Features

- ⚡ Vite for fast development
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS + shadcn/ui components
- 🎯 Lucide React icons
- 📱 Responsive design
- 🌙 Dark mode ready

## Local Development

### Prerequisites

- Node.js 18+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start dev server:
```bash
npm run dev
```

3. Access the app:
- Frontend: http://localhost:5173
- API proxy: http://localhost:5173/api

## Building

```bash
npm run build
npm run preview  # Preview production build
```

## Docker

```bash
docker build -t workshelf-frontend .
docker run -p 80:80 workshelf-frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── lib/           # Utilities
│   ├── App.tsx        # Main app
│   └── main.tsx       # Entry point
├── public/            # Static assets
└── index.html
```

## Adding shadcn/ui Components

Ready for shadcn/ui! To add components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

## Next Steps

- 🔲 Add authentication flow
- 🔲 Create document editor
- 🔲 Add studio management UI
- 🔲 Implement collaboration features
