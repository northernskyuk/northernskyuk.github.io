 function toggleSearchMode() {
    const mainButtonSection = document.getElementById('mainButtonSection');
    const searchButtonSection = document.getElementById('searchButtonSection');
	   const defaultDisplay = document.getElementById('defaultDisplay');
    const textInputDisplay = document.getElementById('textInputDisplay');
	
    const resultsButtonSection = document.getElementById('resultsButtonSection');	
    // Determine which button set is visible
    const isMainVisible = mainButtonSection.style.display === 'grid' || mainButtonSection.style.display === '';
	const isResultVisible = resultsButtonSection.style.display === 'grid';
	
	
	if (isResultVisible) {
	
mainButtonSection.style.display = 'grid';
resultsButtonSection.style.display = 'none';	}
	else {
    mainButtonSection.style.display = mainButtonSection.style.display === 'none' ? 'grid' : 'none';
    searchButtonSection.style.display = searchButtonSection.style.display === 'none' ? 'grid' : 'none';
   } 	
	
	 if (searchButtonSection.style.display === 'grid') {
        defaultDisplay.style.display = 'none';
        textInputDisplay.style.display = 'block';
        textInputDisplay.focus(); // Focus the input field for typing
    } else {
        defaultDisplay.style.display = 'block';
        textInputDisplay.style.display = 'none';
        textInputDisplay.value = ''; // Clear input on exit
    }
};
 
 
 const filterTypes = ['ARTIST', 'ALBUM', 'TRACK', 'PLAYLIST'];
    let currentFilterIndex = 2; // Starting with 'Track'
    let selectedFilter = filterTypes[currentFilterIndex]; // Current selected filter

    // Function to cycle through filters
    function cycleFilter() {
        // Update the filter index
        currentFilterIndex = (currentFilterIndex + 1) % filterTypes.length;
        
        // Set the selected filter based on the new index
        selectedFilter = filterTypes[currentFilterIndex];

        // Update the button text to show the current filter
        document.getElementById('category').textContent = `${selectedFilter}`;
        console.log(`Current filter set to: ${selectedFilter}`);
    }
	
	function showResults() {
    const mainButtonSection = document.getElementById('mainButtonSection');
    const searchButtonSection = document.getElementById('searchButtonSection');
	const resultsButtonSection = document.getElementById('resultsButtonSection');
	const defaultDisplay = document.getElementById('defaultDisplay');
    const textInputDisplay = document.getElementById('textInputDisplay');
	
    resultsButtonSection.style.display = 'grid';
    searchButtonSection.style.display = 'none';	
    mainButtonSection.style.display = 'none';	 	
    defaultDisplay.style.display = 'block';
    textInputDisplay.style.display = 'none';
    textInputDisplay.value = ''; // Clear input on exit
};


function populateSearchButtons(results) {
    const buttons = document.querySelectorAll('#resultsButtonSection .button');
    showResults(); // Toggle the visibility of results section

    let items = [];
    switch (selectedFilter.toLowerCase()) {
        case 'track':
            items = results.tracks.items;
            break;
        case 'album':
            items = results.albums.items;
            break;
        case 'artist':
            items = results.artists.items;
            break;
        case 'playlist':
            items = results.playlists.items;
            break;
        default:
            console.error("Unknown search type");
            return;
    }

    // Filter out null items
    const filteredItems = items.filter(item => item !== null && item !== undefined);

    buttons.forEach((button, index) => {
        const item = filteredItems[index];
        let artworkUrl, name, secondaryInfo, uri;

        const artworkElement = button.querySelector('.button-artwork');
        const trackNameElement = button.querySelector('.button-track-name');
        const artistNameElement = button.querySelector('.button-artist-name');

        if (item) {
            switch (selectedFilter.toLowerCase()) {
                case 'track':
                    artworkUrl = item.album.images[0]?.url;
                    name = item.name;
                    secondaryInfo = item.artists.map(artist => artist.name).join(', ');
                    uri = item.uri;
                    break;
                case 'album':
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = item.artists.map(artist => artist.name).join(', ');
                    uri = item.uri;
                    break;
                case 'artist':
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = "Artist";
                    uri = item.uri;
                    break;
                case 'playlist':
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = `by ${item.owner.display_name}`;
                    uri = item.uri;
                    break;
            }
            if (artworkElement) {
                artworkElement.src = artworkUrl || '';
                artworkElement.alt = `${name} Artwork`;
                artworkElement.style.visibility = artworkUrl ? 'visible' : 'hidden';
            }
            if (trackNameElement) trackNameElement.textContent = name;
            if (artistNameElement) artistNameElement.textContent = secondaryInfo;

            button.dataset.trackUri = uri;
        } else {
            if (trackNameElement) trackNameElement.textContent = '';
            if (artistNameElement) artistNameElement.textContent = '';
            if (artworkElement) {
                artworkElement.src = '';
                artworkElement.alt = 'No Artwork';
                artworkElement.style.visibility = 'hidden';
            }
            delete button.dataset.trackUri;
        }
        button.style.display = 'flex'; // Always show the button
    });
} 