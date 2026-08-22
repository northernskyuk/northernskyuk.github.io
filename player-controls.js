const POINTER_LONG_PRESS_MS = 500;
const KEYBOARD_LONG_PRESS_MS = 1200;
const QUEUE_SKIP_STEP_DELAY_MS = 220;
const QUEUE_REFRESH_DELAY_MS = 1000;
let queueSkipInProgress = false;
let progressTimer = null;
let currentPosition = 0;
let durationMs = 0;
let isPlaying = false;
let connectStateTimer = null;

const isConnectMode = () => localStorage.getItem('spotify_playback_mode') === 'connect';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function updatePlayPauseIcon(isTrackPlaying) {
    const playButtonIcon = document.getElementById('togglePlay').querySelector('i');
    playButtonIcon.className = isTrackPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateProgressUI(position, duration) {
    document.getElementById('current-position').innerHTML = formatTime(position / 1000);
    document.getElementById('duration').innerHTML = formatTime(duration / 1000);
}

function startProgressTimer() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        if (isPlaying && currentPosition < durationMs) {
            currentPosition += 1000;
            updateProgressUI(currentPosition, durationMs);
        }
    }, 1000);
}

function stopProgressTimer() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
}

function renderPlaybackState(state) {
    if (!state || !state.item) {
        stopProgressTimer();
        return;
    }

    const currentTrack = state.item;
    document.getElementById('track-name').textContent = currentTrack.name;
    document.getElementById('artist-name').textContent = currentTrack.artists[0].name;
    document.getElementById('album-name').textContent = currentTrack.album.name;
    currentPosition = state.progress_ms;
    durationMs = currentTrack.duration_ms;
    isPlaying = state.is_playing;
    updateProgressUI(currentPosition, durationMs);
    document.getElementById('track-image').src = currentTrack.album.images[0]?.url || '';
    document.getElementById('trackDetails').style.display = 'flex';
    document.getElementById('connectMessage').style.display = 'none';
    updatePlayPauseIcon(isPlaying);

    if (isPlaying) {
        startProgressTimer();
    } else {
        stopProgressTimer();
    }
}

function updateState() {
    if (isConnectMode()) {
        fetchPlaybackState().then(renderPlaybackState).catch(error => {
            console.error('Error fetching Connect playback state:', error);
        });
        return;
    }

    if (!window.player) return;

    window.player.getCurrentState().then(state => {
        if (!state) {
            console.error('User is not playing music through the Web Playback SDK');
            stopProgressTimer();
            return;
        }

        renderPlaybackState({
            item: state.track_window.current_track,
            progress_ms: state.position,
            is_playing: !state.paused
        });
    });
}

function startConnectStatePolling() {
    if (connectStateTimer) clearInterval(connectStateTimer);
    updateState();
    fetchPlayQueue();
    connectStateTimer = setInterval(() => {
        updateState();
        fetchPlayQueue();
    }, 5000);
}

function ensureSpotifyAuth() {
    if (!hasSpotifySession()) {
        redirectToSpotifyAuthorize();
        return false;
    }
    return true;
}

async function jumpToQueueIndex(queueIndex, targetUri) {
    if (isConnectMode()) {
        if (queueSkipInProgress) return;
        queueSkipInProgress = true;
        try {
            for (let step = 0; step <= queueIndex; step++) {
                await sendPlaybackCommand('next');
                let state = null;
                for (let attempt = 0; attempt < 5; attempt++) {
                    await wait(QUEUE_SKIP_STEP_DELAY_MS);
                    state = await fetchPlaybackState();
                    if (state?.item?.uri === targetUri) break;
                }
                if (state?.item?.uri === targetUri) break;
            }
            await fetchPlayQueue();
            updateState();
        } finally {
            queueSkipInProgress = false;
        }
        return;
    }

    if (!window.player) {
        console.error('Spotify player not available');
        return;
    }

    if (queueSkipInProgress) {
        console.warn('Queue skip already in progress');
        return;
    }

    const steps = queueIndex + 1;
    queueSkipInProgress = true;

    try {
        for (let step = 0; step < steps; step++) {
            await window.player.nextTrack();
            let state = null;
            for (let attempt = 0; attempt < 5; attempt++) {
                await wait(QUEUE_SKIP_STEP_DELAY_MS);
                state = await window.player.getCurrentState();
                if (state?.track_window?.current_track?.uri === targetUri) break;
            }
            if (state?.track_window?.current_track?.uri === targetUri) break;
        }
        updateState();
    } finally {
        queueSkipInProgress = false;
    }
}

async function handleMainQueueButtonPress(button, index, isLongPress) {
    const trackUri = button.dataset.trackUri;
    if (!trackUri) {
        console.error('No track URI found for this button');
        return;
    }

    if (isLongPress) {
        if (queueSkipInProgress) {
            console.warn('Queue skip in progress, ignoring takeover request');
            return;
        }
        await playTrack(trackUri);
        return;
    }

    await jumpToQueueIndex(index, trackUri);
}

async function toggleShuffle() {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders) {
        await redirectToSpotifyAuthorize('toggle_shuffle_missing_token');
        return;
    }

    try {
        const stateResponse = await fetch('https://api.spotify.com/v1/me/player', {
            headers: authHeaders
        });

        if (stateResponse.ok) {
            const state = await stateResponse.json();
            const currentShuffle = state.shuffle_state;
            const newShuffleState = !currentShuffle;

            const query = new URLSearchParams({ state: String(newShuffleState) });
            const deviceId = getSelectedDeviceId();
            if (deviceId) query.set('device_id', deviceId);
            const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?${query}`, {
                method: 'PUT',
                headers: authHeaders
            });

            if (response.ok) {
                console.log(`Shuffle ${newShuffleState ? 'enabled' : 'disabled'}`);
            } else {
                console.error('Failed to toggle shuffle:', response.status);
            }
        }
    } catch (error) {
        console.error('Error toggling shuffle:', error);
    }
}

async function adjustConnectVolume(delta) {
    try {
        const state = await fetchPlaybackState();
        if (!state?.device || state.device.volume_percent === null) return;
        const volume = Math.max(0, Math.min(100, state.device.volume_percent + delta));
        await setPlaybackVolume(volume);
    } catch (error) {
        console.error('Error adjusting Connect volume:', error);
    }
}

function bindConnectControls() {
    if (!isConnectMode()) return;

    document.getElementById('togglePlay').onclick = async () => {
        try {
            const state = await fetchPlaybackState();
            await setPlaybackPaused(Boolean(state?.is_playing));
            updateState();
        } catch (error) {
            console.error('Error toggling Connect playback:', error);
        }
    };
    document.getElementById('previousTrack').onclick = async () => {
        await sendPlaybackCommand('previous');
        await wait(QUEUE_REFRESH_DELAY_MS);
        await fetchPlayQueue();
        updateState();
    };
    document.getElementById('nextTrack').onclick = async () => {
        await sendPlaybackCommand('next');
        await wait(QUEUE_REFRESH_DELAY_MS);
        await fetchPlayQueue();
        updateState();
    };
    startConnectStatePolling();
}

window.onSpotifyWebPlaybackSDKReady = () => {
    if (localStorage.getItem('spotify_playback_mode') !== 'browser') {
        return;
    }

    if (!hasSpotifySession()) {
        console.warn('Spotify session not available yet; skipping SDK player initialization.');
        return;
    }

    const player = new Spotify.Player({
        name: 'Jubeat Jukebox',
        getOAuthToken: async cb => {
            const token = await getValidAccessToken();
            if (token) {
                cb(token);
                return;
            }

            await redirectToSpotifyAuthorize('sdk_oauth_token_unavailable');
        },
        volume: 0.5
    });

    window.player = player;

    let fetchPlayQueueTimeout;
    const debouncedFetchPlayQueue = () => {
        if (fetchPlayQueueTimeout) {
            clearTimeout(fetchPlayQueueTimeout);
        }
        fetchPlayQueueTimeout = setTimeout(fetchPlayQueue, 1000);
    };

    player.addListener('player_state_changed', () => {
        updateState();
        debouncedFetchPlayQueue();
        player.getCurrentState().then(state => {
            if (state) {
                updatePlayPauseIcon(!state.paused);
            }
        });

        document.getElementById('connectMessage').style.display = 'none';
        document.getElementById('trackDetails').style.display = 'flex';
    });

    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        localStorage.setItem('device_id', device_id);
        setSelectedDeviceId(device_id);
        transferPlayback(device_id, true).catch(error => {
            console.error('Error transferring playback to browser:', error);
        });
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    player.addListener('initialization_error', ({ message }) => {
        console.error(message);
    });

    player.addListener('authentication_error', async ({ message }) => {
        console.error(message);
        localStorage.removeItem('spotify_access_token');
        const refreshed = await refreshAccessToken(true);
        if (!refreshed) {
            await redirectToSpotifyAuthorize('sdk_authentication_error');
        }
    });

    player.addListener('account_error', ({ message }) => {
        console.error(message);
    });

    player.connect();

    window.playbackSetupComplete = true;

    document.getElementById('togglePlay').onclick = () => {
        player.togglePlay().then(() => {
            player.getCurrentState().then(state => {
                if (state) {
                    updatePlayPauseIcon(!state.paused);
                }
            });
        });
    };

    document.getElementById('previousTrack').onclick = () => player.previousTrack();
    document.getElementById('nextTrack').onclick = () => player.nextTrack();

    initInputHandling();
};
