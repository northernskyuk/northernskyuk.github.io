const fetchWithRefresh = async (url, options = {}) => {
    const authHeaders = await getAuthHeaders(options.headers || {});
    if (!authHeaders) {
        await redirectToSpotifyAuthorize('missing_or_expired_token_for_api');
        throw new Error('No valid Spotify access token available');
    }

    options.headers = authHeaders;

    let response = await fetch(url, options);

    if (response.status === 401) {
        const refreshed = await refreshAccessToken(true);
        if (!refreshed) {
            await redirectToSpotifyAuthorize('refresh_failed_after_401');
            throw new Error('Spotify token refresh failed after 401');
        }

        const refreshedHeaders = await getAuthHeaders(options.headers || {});
        if (!refreshedHeaders) {
            await redirectToSpotifyAuthorize('missing_token_after_refresh');
            throw new Error('No valid Spotify access token after refresh');
        }

        options.headers = refreshedHeaders;
        response = await fetch(url, options);
    }

    return response;
};

const fetchPlayQueue = async () => {
    const url = 'https://api.spotify.com/v1/me/player/queue';
    try {
        const response = await fetchWithRefresh(url);
        if (response.ok) {
            const queueData = await response.json();
            populateButtons(queueData.queue.slice(0, 12));
        } else {
            console.error('Failed to fetch play queue:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching play queue:', error);
    }
};


// Spotify Search Function
async function searchSpotify(query) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${selectedFilter.toLowerCase()}&limit=12`;
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetchWithRefresh(url, options);
        if (response.ok) {
            const data = await response.json();
			populateSearchButtons(data);
            console.log('Search results:', data);
		// Log results for now
            // TODO: Display search results on the UI
        } else {
            console.error('Search failed:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error searching Spotify:', error);
    }
};

const playTrack = async (trackUri) => {
		console.log(trackUri);
		const device_id = localStorage.getItem('device_id');
            const url = 'https://api.spotify.com/v1/me/player/play?device_id='+device_id;
             const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    };

    // Determine how to set the URI based on its type
    if (trackUri.startsWith("spotify:track")) {
        options.body = JSON.stringify({ uris: [trackUri] }); // Play specific track
    } else if (trackUri.startsWith("spotify:album") || trackUri.startsWith("spotify:artist") || trackUri.startsWith("spotify:playlist")) {
        options.body = JSON.stringify({ context_uri: trackUri }); // Play album, artist, or playlist
    } else {
        console.error("Unsupported URI type:", trackUri);
        return;
    }

            try {
                const response = await fetchWithRefresh(url, options);
                if (response.ok) {
                    console.log(`Playing track: ${trackUri}`);
                } else {
                    console.error('Failed to play track:', response.status);
                }
            } catch (error) {
                console.error('Error starting playback:', error);
            }
        };