/**
 * YouTube Data API Fetcher Utility
 * Fetches playlist videos and video details from YouTube Data API v3
 */

import { IVideoContent } from '../types/index.js';
import { getYouTubeThumbnailUrl } from './youtubeParser.js';

export interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high: { url: string };
        medium: { url: string };
        default: { url: string };
      };
    };
    contentDetails: {
      duration: string; // ISO 8601 duration format (PT4M13S)
    };
  }>;
}

export interface YouTubePlaylistItemsResponse {
  items: Array<{
    snippet: {
      position: number;
      resourceId: {
        videoId: string;
      };
      title: string;
      description: string;
      thumbnails: {
        high: { url: string };
        medium: { url: string };
        default: { url: string };
      };
    };
  }>;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

/**
 * Convert ISO 8601 duration to seconds
 * Example: PT4M13S -> 253 seconds
 */
function parseDuration(isoDuration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch all videos from a YouTube playlist
 */
export async function fetchYouTubePlaylistVideos(
  playlistId: string,
  apiKey?: string
): Promise<IVideoContent[]> {
  const API_KEY = apiKey || process.env.YOUTUBE_API_KEY;
  
  console.log('[YouTube Fetcher] Starting playlist fetch...', {
    playlistId,
    hasApiKey: !!API_KEY,
    apiKeyPrefix: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'N/A'
  });
  
  if (!API_KEY) {
    console.error('[YouTube Fetcher] ERROR: YouTube API key is not configured');
    throw new Error('YouTube API key is not configured. Please set YOUTUBE_API_KEY environment variable.');
  }

  const videos: IVideoContent[] = [];
  let nextPageToken: string | undefined;
  const maxResults = 50; // Maximum items per page
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`[YouTube Fetcher] Fetching page ${pageCount}...`, {
      playlistId,
      hasNextPageToken: !!nextPageToken,
      currentVideosCount: videos.length
    });

    // Fetch playlist items
    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl.searchParams.set('part', 'snippet');
    playlistUrl.searchParams.set('playlistId', playlistId);
    playlistUrl.searchParams.set('maxResults', maxResults.toString());
    playlistUrl.searchParams.set('key', API_KEY);
    
    if (nextPageToken) {
      playlistUrl.searchParams.set('pageToken', nextPageToken);
    }

    console.log(`[YouTube Fetcher] Request URL: ${playlistUrl.toString().replace(API_KEY, 'API_KEY_HIDDEN')}`);
    
    const playlistResponse = await fetch(playlistUrl.toString());
    
    console.log(`[YouTube Fetcher] Response status: ${playlistResponse.status} ${playlistResponse.statusText}`);
    
    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json().catch(() => ({})) as { error?: { message?: string; errors?: any[] } };
      console.error('[YouTube Fetcher] ERROR: Failed to fetch playlist items', {
        status: playlistResponse.status,
        statusText: playlistResponse.statusText,
        error: errorData.error
      });
      throw new Error(
        `Failed to fetch playlist items: ${playlistResponse.status} ${
          errorData.error?.message || playlistResponse.statusText
        }`
      );
    }

    const playlistData = await playlistResponse.json() as YouTubePlaylistItemsResponse;
    
    console.log(`[YouTube Fetcher] Page ${pageCount} response:`, {
      itemsCount: playlistData.items?.length || 0,
      totalResults: playlistData.pageInfo?.totalResults || 0,
      hasNextPage: !!playlistData.nextPageToken
    });

    if (!playlistData.items || playlistData.items.length === 0) {
      console.log(`[YouTube Fetcher] No items found on page ${pageCount}, stopping`);
      break;
    }

    // Extract video IDs
    const videoIds = playlistData.items
      .map((item) => item.snippet.resourceId?.videoId)
      .filter((id): id is string => !!id);

    console.log(`[YouTube Fetcher] Extracted ${videoIds.length} video IDs from page ${pageCount}`);

    if (videoIds.length > 0) {
      console.log(`[YouTube Fetcher] Fetching video details for ${videoIds.length} videos...`);
      // Fetch video details (including duration) in batches
      const videoDetailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videoDetailsUrl.searchParams.set('part', 'snippet,contentDetails');
      videoDetailsUrl.searchParams.set('id', videoIds.join(','));
      videoDetailsUrl.searchParams.set('key', API_KEY);

      const videoDetailsResponse = await fetch(videoDetailsUrl.toString());
      
      console.log(`[YouTube Fetcher] Video details response: ${videoDetailsResponse.status}`);
      
      if (!videoDetailsResponse.ok) {
        const errorData = await videoDetailsResponse.json().catch(() => ({})) as { error?: { message?: string } };
        console.error('[YouTube Fetcher] ERROR: Failed to fetch video details', {
          status: videoDetailsResponse.status,
          error: errorData.error
        });
        throw new Error(
          `Failed to fetch video details: ${videoDetailsResponse.status} ${
            errorData.error?.message || videoDetailsResponse.statusText
          }`
        );
      }

      const videoDetailsData = await videoDetailsResponse.json() as YouTubeVideoResponse;
      
      console.log(`[YouTube Fetcher] Received details for ${videoDetailsData.items?.length || 0} videos`);

      // Create a map of video ID to video details for quick lookup
      const videoDetailsMap = new Map(
        videoDetailsData.items.map((item) => [
          item.id,
          {
            title: item.snippet.title,
            description: item.snippet.description,
            duration: parseDuration(item.contentDetails.duration),
            thumbnail: item.snippet.thumbnails.high?.url || 
                      item.snippet.thumbnails.medium?.url || 
                      item.snippet.thumbnails.default?.url,
          },
        ])
      );

      // Combine playlist items with video details
      let addedCount = 0;
      playlistData.items.forEach((item) => {
        const videoId = item.snippet.resourceId?.videoId;
        if (!videoId) {
          console.warn(`[YouTube Fetcher] Item missing videoId at position ${item.snippet.position}`);
          return;
        }

        const details = videoDetailsMap.get(videoId);
        if (!details) {
          console.warn(`[YouTube Fetcher] No details found for videoId: ${videoId}`);
          return;
        }

        const video = {
          videoId,
          title: details.title || item.snippet.title,
          description: details.description || item.snippet.description,
          duration: details.duration,
          order: item.snippet.position + 1, // Position is 0-indexed
          thumbnail: details.thumbnail || getYouTubeThumbnailUrl(videoId),
        };
        
        videos.push(video);
        addedCount++;
        
        console.log(`[YouTube Fetcher] Added video ${addedCount}:`, {
          videoId,
          title: video.title.substring(0, 50),
          duration: video.duration,
          order: video.order
        });
      });
      
      console.log(`[YouTube Fetcher] Successfully processed ${addedCount} videos from page ${pageCount}`);
    } else {
      console.warn(`[YouTube Fetcher] No valid video IDs found on page ${pageCount}`);
    }

    nextPageToken = playlistData.nextPageToken;
    if (nextPageToken) {
      console.log(`[YouTube Fetcher] More pages available, continuing...`);
    }
  } while (nextPageToken);

  // Sort by order to ensure correct sequence
  videos.sort((a, b) => a.order - b.order);

  console.log(`[YouTube Fetcher] ✅ Completed fetching playlist. Total videos: ${videos.length}`);
  console.log(`[YouTube Fetcher] Video summary:`, videos.map(v => ({
    order: v.order,
    title: v.title.substring(0, 40),
    videoId: v.videoId,
    duration: v.duration
  })));

  return videos;
}

/**
 * Fetch a single video's details from YouTube
 */
export async function fetchYouTubeVideoDetails(
  videoId: string,
  apiKey?: string
): Promise<IVideoContent> {
  const API_KEY = apiKey || process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('YouTube API key is not configured. Please set YOUTUBE_API_KEY environment variable.');
  }

  const videoUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videoUrl.searchParams.set('part', 'snippet,contentDetails');
  videoUrl.searchParams.set('id', videoId);
  videoUrl.searchParams.set('key', API_KEY);

  const response = await fetch(videoUrl.toString());
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      `Failed to fetch video details: ${response.status} ${
        errorData.error?.message || response.statusText
      }`
    );
  }

  const data = await response.json() as YouTubeVideoResponse;
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const item = data.items[0];
  const duration = parseDuration(item.contentDetails.duration);

  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    duration,
    order: 1,
    thumbnail: item.snippet.thumbnails.high?.url || 
              item.snippet.thumbnails.medium?.url || 
              item.snippet.thumbnails.default?.url || 
              getYouTubeThumbnailUrl(videoId),
  };
}
