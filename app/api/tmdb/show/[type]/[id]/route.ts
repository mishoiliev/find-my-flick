import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ type: string; id: string }>;
  }
) {
  let type: string;
  let id: string;

  try {
    const resolvedParams = await params;
    type = resolvedParams.type;
    id = resolvedParams.id;
  } catch (paramsError) {
    console.error('Error resolving params:', paramsError);
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  }

  if (!type || !id) {
    return NextResponse.json(
      { error: 'Missing type or id parameter' },
      { status: 400 }
    );
  }

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  // Validate API key
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set');
    return NextResponse.json(
      { error: 'TMDB API key is not configured' },
      { status: 500 }
    );
  }

  const showId = parseInt(id);
  if (isNaN(showId)) {
    return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
  }

  try {
    let showResponse: Response;
    let externalIdsResponse: Response;

    try {
      const fetchWithTimeout = async (
        url: string,
        options: RequestInit,
        timeoutMs = 30000
      ): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      };

      showResponse = await fetchWithTimeout(
        `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      );
    } catch (fetchError) {
      console.error('Error fetching from TMDB API:', fetchError);
      const isTimeout =
        fetchError instanceof Error && fetchError.message === 'Request timeout';
      throw new Error(
        isTimeout
          ? 'Request to TMDB API timed out'
          : `Network error when fetching from TMDB: ${
              fetchError instanceof Error ? fetchError.message : 'Unknown error'
            }`
      );
    }

    if (!showResponse.ok) {
      const errorText = await showResponse.text().catch(() => 'Unknown error');
      let errorMessage = `Failed to fetch show details: ${showResponse.status} ${showResponse.statusText}`;

      // Try to parse error message from TMDB response
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.status_message) {
          errorMessage = `TMDB API error: ${errorData.status_message} (${showResponse.status})`;
        }
      } catch {
        // If parsing fails, use the raw text if available
        if (errorText && errorText !== 'Unknown error') {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }

      console.error(
        `TMDB API error: ${showResponse.status} ${showResponse.statusText} - ${errorText}`
      );
      return NextResponse.json(
        { error: errorMessage },
        { status: showResponse.status >= 500 ? 500 : showResponse.status }
      );
    }

    let data: any;
    try {
      data = await showResponse.json();
    } catch (jsonError) {
      console.error('Error parsing show response JSON:', jsonError);
      throw new Error(
        `Failed to parse show response: ${
          jsonError instanceof Error ? jsonError.message : 'Unknown error'
        }`
      );
    }

    // Validate that we have the required data
    if (
      !data ||
      !data.id ||
      (type === 'movie' && !data.title) ||
      (type === 'tv' && !data.name)
    ) {
      console.error('Invalid show data received:', {
        type,
        id,
        hasData: !!data,
        dataId: data?.id,
        title: data?.title,
        name: data?.name,
      });
      return NextResponse.json(
        { error: 'Invalid show data received from TMDB API' },
        { status: 500 }
      );
    }

    const show = {
      ...data,
      media_type: type,
      title: type === 'movie' ? data.title : data.name,
      name: type === 'tv' ? data.name : data.title,
    };

    const cleanShow: any = {};
    for (const [key, value] of Object.entries(show)) {
      if (typeof value === 'function' || value === undefined) {
        continue;
      }
      if (key === 'vote_average' && typeof value !== 'number') {
        cleanShow[key] = 0;
        continue;
      }
      cleanShow[key] = value;
    }

    const hasTitle = cleanShow.title || (type === 'tv' && cleanShow.name);
    if (!cleanShow.id || !hasTitle) {
      console.error('Missing required fields after cleanup:', {
        id: cleanShow.id,
        title: cleanShow.title,
        name: cleanShow.name,
        type,
        originalDataKeys: Object.keys(data || {}),
      });
      if (type === 'tv' && cleanShow.name && !cleanShow.title) {
        cleanShow.title = cleanShow.name;
      } else if (!cleanShow.id || !hasTitle) {
        return NextResponse.json(
          { error: 'Invalid show data structure' },
          { status: 500 }
        );
      }
    }

    try {
      JSON.stringify(cleanShow);
      return NextResponse.json(cleanShow);
    } catch (jsonError) {
      console.error('Error serializing show response to JSON:', {
        error: jsonError,
        showKeys: Object.keys(show),
        cleanShowKeys: Object.keys(cleanShow),
      });
      const minimalShow = {
        id: show.id,
        title: show.title || show.name || 'Unknown',
        name: show.name || show.title,
        overview: show.overview || '',
        poster_path: show.poster_path || null,
        backdrop_path: show.backdrop_path || null,
        media_type: show.media_type || type,
        release_date: show.release_date,
        first_air_date: show.first_air_date,
        last_air_date: show.last_air_date,
        vote_average:
          typeof show.vote_average === 'number' ? show.vote_average : 0,
        genres: Array.isArray(show.genres) ? show.genres : undefined,
      };
      return NextResponse.json(minimalShow, { status: 200 });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error fetching show details:', {
      message: errorMessage,
      stack: errorStack,
      type,
      id,
      error,
    });
    return NextResponse.json(
      {
        error: `Failed to fetch show details: ${errorMessage}`,
        details:
          process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
