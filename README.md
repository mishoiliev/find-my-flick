# WhereToWatch

A modern streaming service aggregator app similar to JustWatch, with an improved search experience. Find where to watch your favorite movies and TV shows.

## Features

- 🎬 **Comprehensive Show Database** - Powered by The Movie Database (TMDB) API
- 🔍 **Advanced Search** - Fuzzy search with instant results using Fuse.js
- 📱 **Responsive Design** - Beautiful, modern UI that works on all devices
- ⚡ **Fast Performance** - Built with Next.js 14 and optimized for speed
- 🎨 **Modern UI** - Clean, dark-themed interface with smooth animations

## Getting Started

### Prerequisites

- Bun installed ([install Bun](https://bun.sh))
- A free TMDB API key from [themoviedb.org](https://www.themoviedb.org/settings/api)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd WhereToWatch
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

4. Run the development server:
```bash
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Fuse.js** - Powerful fuzzy search library
- **TMDB API** - Movie and TV show database

## Project Structure

```
WhereToWatch/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── show/              # Show detail pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── SearchBar.tsx     # Advanced search component
│   └── ShowGrid.tsx      # Show grid display
├── lib/                   # Utility functions
│   └── tmdb.ts           # TMDB API integration
└── public/                # Static assets
```

## Features in Detail

### Advanced Search

The search functionality combines:
- **Client-side fuzzy search** - Instant results as you type using Fuse.js
- **Server-side search** - Comprehensive results from TMDB API
- **Smart matching** - Searches titles, names, and overviews
- **Dropdown results** - Quick preview with posters and ratings

### Show Display

- Grid layout with responsive columns
- Hover effects and smooth transitions
- Poster images with fallbacks
- Ratings and release dates
- Direct links to show details

## Future Enhancements

- [ ] Streaming platform integration (Netflix, Hulu, etc.)
- [ ] User favorites and watchlists
- [ ] Filter by genre, year, rating
- [ ] Recommendations based on viewing history
- [ ] Price tracking for rentals/purchases
- [ ] User reviews and ratings

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
# find-my-flick
