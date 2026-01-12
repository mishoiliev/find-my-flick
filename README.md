# ** DISCLAIMER: This is fully vibe coded as a part of a semi-experiment. Good practices are not displayed here and contributing would be a nightmare **

# Find My Flick

A modern streaming service aggregator app similar to JustWatch, with an improved search experience. Find where to watch your favorite movies and TV shows.

## Features

- 🎬 **Comprehensive Show Database** - Powered by The Movie Database (TMDB) API
- 🔍 **Advanced Search** - Dual-mode search with instant client-side fuzzy results (Fuse.js) and comprehensive server-side search with pagination
- 📺 **Streaming Platform Integration** - See where to watch content (stream, rent, or buy) with provider logos
- 👥 **Actor Pages** - Browse actor profiles with biography, most popular works, and filterable credits
- 🎭 **Cast Information** - View full cast lists with clickable actor profiles
- 🔥 **Hype Meter** - Visual popularity indicator for shows and actors
- 📱 **Responsive Design** - Beautiful, modern UI that works on all devices
- ⚡ **Fast Performance** - Built with Next.js 14 with React Server Components and optimized caching
- 🎨 **Modern UI** - Clean, dark-themed interface with smooth animations and hover effects

## Getting Started

### Prerequisites

- Bun installed ([install Bun](https://bun.sh))
- A free TMDB API key from [themoviedb.org](https://www.themoviedb.org/settings/api)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd find-my-flick
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env.local` file in the root directory:

```env
TMDB_API_KEY=your_tmdb_api_key_here
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
find-my-flick/
├── app/                    # Next.js app directory
│   ├── actions/           # Server actions
│   │   └── search.ts     # Search functionality
│   ├── actor/            # Actor detail pages
│   │   └── [id]/        # Dynamic actor routes
│   ├── api/              # API routes
│   │   └── shows/       # Shows API endpoint
│   ├── search/           # Search results page
│   ├── show/             # Show detail pages
│   │   └── [type]/[id]/ # Dynamic show routes (movie/tv)
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── CastList.tsx     # Cast member list
│   ├── CreditsFilter.tsx # Filterable credits for actors
│   ├── HypeMeter.tsx    # Popularity indicator
│   ├── MostPopularGrid.tsx # Special grid for popular shows
│   ├── Navbar.tsx       # Navigation component
│   ├── Pagination.tsx   # Search pagination
│   ├── SearchBar.tsx    # Advanced search with dropdown
│   ├── ShowGrid.tsx     # Show grid display
│   └── WatchProviders.tsx # Streaming providers display
├── lib/                  # Utility functions
│   ├── cache.ts         # Caching utilities
│   └── tmdb.ts          # TMDB API integration
└── public/              # Static assets
```

## Features in Detail

### Advanced Search

The search functionality combines:

- **Client-side fuzzy search** - Instant results as you type using Fuse.js (100ms debounce)
- **Server-side search** - Comprehensive results from TMDB API (500ms debounce)
- **Smart matching** - Searches titles, names, and overviews with weighted relevance
- **Dropdown results** - Quick preview with posters, ratings, and media type
- **Search page** - Full search results with pagination support
- **Result filtering** - Ensures all displayed results match the search query

### Show Details

- **Comprehensive information** - Title, release date, ratings, and overview
- **Watch providers** - See where to stream, rent, or buy content
- **Cast list** - Browse all cast members with clickable actor profiles
- **Hype meter** - Visual popularity indicator with tooltips
- **Backdrop images** - Full-width hero images for visual appeal
- **Media type badges** - Clear distinction between movies and TV shows

### Actor Pages

- **Actor profiles** - Biography, birth date, and place of birth
- **Most popular works** - Top 8 shows sorted by comprehensive score (hype, reviews, box office)
- **All credits** - Complete filmography with filtering options:
  - Sort by date (newest first)
  - Sort by popularity
- **Hype meter** - Actor popularity indicator
- **Credit count** - Total number of credits displayed

### Show Display

- **Grid layout** - Responsive columns that adapt to screen size
- **Hover effects** - Smooth transitions and scale animations
- **Poster images** - High-quality images with fallbacks
- **Ratings and dates** - Star ratings and release dates
- **Direct navigation** - Click to view show or actor details

## Future Enhancements

- [ ] User favorites and watchlists
- [ ] Filter by genre, year, rating on search results
- [ ] Recommendations based on viewing history
- [ ] Price tracking for rentals/purchases
- [ ] User reviews and ratings
- [ ] Multi-country watch provider support
- [ ] TV show episode information
- [ ] Similar shows/movies recommendations

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
