function populateButtons(tracks) {
    const buttons = document.querySelectorAll('#mainButtonSection .button');

    buttons.forEach((button, index) => {
        const track = tracks[index];
        const artworkElement = button.querySelector('.button-artwork');
        const trackNameElement = button.querySelector('.button-track-name');
        const artistNameElement = button.querySelector('.button-artist-name');

        if (track) {
            if (artworkElement) {
                artworkElement.src = track.album.images[0].url;
                artworkElement.alt = `${track.album.name} Artwork`;
                artworkElement.style.visibility = 'visible';
            }
            if (trackNameElement) trackNameElement.textContent = track.name;
            if (artistNameElement) artistNameElement.textContent = track.artists[0].name;

            button.dataset.trackUri = track.uri;
            button.style.display = 'flex';
        } else {
            if (trackNameElement) trackNameElement.textContent = '';
            if (artistNameElement) artistNameElement.textContent = '';
            if (artworkElement) artworkElement.style.visibility = 'hidden';
            delete button.dataset.trackUri;
        }
    });
}

function updateConnectMessage() {
    const connectMessage = document.getElementById('connectMessage');
    if (!connectMessage) return;

    if (typeof retrieveAccessToken === 'function' && retrieveAccessToken()) {
        connectMessage.textContent = 'Search or connect from another device to start playback!';
        connectMessage.style.display = 'block';
    } else {
        connectMessage.textContent = 'Press a button to connect to Spotify';
        connectMessage.style.display = 'block';
    }
}

const PLAYBACK_MODE_KEY = 'spotify_playback_mode';

const setButtonLabel = (button, label) => {
    button.textContent = label;
    button.dataset.deviceId = '';
    button.style.display = 'flex';
};

const showPlaybackChoice = () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons.forEach((button, index) => {
        button.style.display = index < 2 ? 'flex' : 'none';
        button.dataset.setupChoice = index < 2 ? 'true' : 'false';
        delete button.dataset.deviceId;
        delete button.dataset.trackUri;
    });
    setButtonLabel(buttons[0], 'BROWSER PLAYBACK');
    setButtonLabel(buttons[1], 'SPOTIFY CONNECT');
    document.getElementById('connectMessage').textContent = 'Choose where Spotify should play';
    document.getElementById('connectMessage').style.display = 'block';
};

const showConnectDevices = async () => {
    const buttons = document.querySelectorAll('#mainButtonSection .button');
    buttons[0].removeAttribute('id');
    buttons[1].removeAttribute('id');
    buttons.forEach(button => {
        button.style.display = 'none';
        delete button.dataset.setupChoice;
        delete button.dataset.trackUri;
    });

    try {
        const { devices } = await fetchSpotifyDevices();
        devices.slice(0, 12).forEach((device, index) => {
            const button = buttons[index];
            setButtonLabel(button, device.name);
            button.dataset.deviceId = device.id;
            button.title = `${device.type}${device.is_active ? ' (active)' : ''}`;
        });

        if (!devices.length) {
            setButtonLabel(buttons[0], 'NO DEVICES FOUND');
        }
        document.getElementById('connectMessage').textContent = 'Choose a Spotify Connect device';
    } catch (error) {
        console.error('Error fetching Spotify devices:', error);
        setButtonLabel(buttons[0], 'RETRY CONNECT');
        document.getElementById('connectMessage').textContent = 'Spotify Connect devices unavailable';
    }
};

const selectPlaybackMode = async (mode) => {
    if (mode === 'browser') {
        setSelectedDeviceId(null);
        localStorage.setItem(PLAYBACK_MODE_KEY, mode);
        window.location.reload();
        return;
    }

    await showConnectDevices();
};

const selectConnectDevice = async (deviceId) => {
    try {
        await transferPlayback(deviceId);
        setSelectedDeviceId(deviceId);
        localStorage.setItem(PLAYBACK_MODE_KEY, 'connect');
        window.location.reload();
    } catch (error) {
        console.error('Error selecting Spotify Connect device:', error);
    }
};

function bindSearchControlButtons() {
    const shuffle = document.getElementById('shuffle');
    const volumeUp = document.getElementById('volumeUp');
    const volumeDown = document.getElementById('volumeDown');

    if (shuffle) {
        shuffle.addEventListener('click', () => {
            shuffle.classList.add('active');
            setTimeout(() => shuffle.classList.remove('active'), 100);
            toggleShuffle();
        });
    }

    if (volumeUp) {
        volumeUp.addEventListener('click', () => {
            volumeUp.classList.add('active');
            setTimeout(() => volumeUp.classList.remove('active'), 100);
            if (typeof isConnectMode === 'function' && isConnectMode()) {
                adjustConnectVolume(5);
            } else if (window.player) {
                window.player.getVolume().then(currentVolume => {
                    const newVolume = Math.min(1, currentVolume + 0.05);
                    window.player.setVolume(newVolume);
                });
            }
        });
    }

    if (volumeDown) {
        volumeDown.addEventListener('click', () => {
            volumeDown.classList.add('active');
            setTimeout(() => volumeDown.classList.remove('active'), 100);
            if (typeof isConnectMode === 'function' && isConnectMode()) {
                adjustConnectVolume(-5);
            } else if (window.player) {
                window.player.getVolume().then(currentVolume => {
                    const newVolume = Math.max(0, currentVolume - 0.05);
                    window.player.setVolume(newVolume);
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initInputHandling();
    const playbackMode = localStorage.getItem(PLAYBACK_MODE_KEY);
    if (!playbackMode) {
        showPlaybackChoice();
    } else if (playbackMode === 'connect') {
        fetchPlayQueue();
        window.playbackSetupComplete = true;
    }
    bindConnectControls();
    updateConnectMessage();
    bindSearchControlButtons();
});
