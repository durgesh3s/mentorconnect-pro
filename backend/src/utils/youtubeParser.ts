/**
 * YouTube URL Parser Utility
 * Parses YouTube URLs and extracts video/playlist information
 */

export interface YouTubeParseResult {
  type: 'video' | 'playlist' | 'invalid';
  videoId?: string;
  playlistId?: string;
  isValid: boolean;
}

/**
 * Parse YouTube URL and extract video or playlist ID
 */
export function parseYouTubeUrl(url: string): YouTubeParseResult {
  if (!url || typeof url !== 'string') {
    return { type: 'invalid', isValid: false };
  }

  // Remove trailing slashes and whitespace
  url = url.trim().replace(/\/+$/, '');

  // Single Video Patterns
  const videoPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  // Playlist Patterns
  const playlistPatterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  // Check for playlist first (if both are present, playlist takes priority)
  for (const pattern of playlistPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Also check if there's a video ID in the URL
      const videoMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return {
        type: 'playlist',
        playlistId: match[1],
        videoId: videoMatch ? videoMatch[1] : undefined,
        isValid: true,
      };
    }
  }

  // Check for single video
  for (const pattern of videoPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        type: 'video',
        videoId: match[1],
        isValid: true,
      };
    }
  }

  return { type: 'invalid', isValid: false };
}

/**
 * Generate YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generate YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    standard: 'sddefault.jpg',
    maxres: 'maxresdefault.jpg',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
}

/**
 * Validate YouTube URL format
 */
export function isValidYouTubeUrl(url: string): boolean {
  const result = parseYouTubeUrl(url);
  return result.isValid;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const result = parseYouTubeUrl(url);
  return result.videoId || null;
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const result = parseYouTubeUrl(url);
  return result.playlistId || null;
}
