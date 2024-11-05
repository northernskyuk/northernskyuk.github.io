const fetchWithRefresh = async (url, options = {}) => {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
    };

    let response = await fetch(url, options);

    if (response.status === 401) {
        await refreshAccessToken();
        options.headers['Authorization'] = `Bearer ${localStorage.getItem('spotify_access_token')}`;
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