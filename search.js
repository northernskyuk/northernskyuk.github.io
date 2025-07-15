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

    buttons.forEach((button, index) => {
        let item, artworkUrl, name, secondaryInfo, uri;

        // Determine the structure based on the selected filter
        switch (selectedFilter.toLowerCase()) {
            case 'track':
                item = results.tracks.items[index];
                if (item) {
                    artworkUrl = item.album.images[0]?.url;
                    name = item.name;
                    secondaryInfo = item.artists.map(artist => artist.name).join(', ');
                    uri = item.uri;
                }
                break;
            case 'album':
                item = results.albums.items[index];
                if (item) {
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = item.artists.map(artist => artist.name).join(', ');
                    uri = item.uri;
                }
                break;
            case 'artist':
                item = results.artists.items[index];
                if (item) {
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = "Artist";
                    uri = item.uri;
                }
                break;
            case 'playlist':
                item = results.playlists.items[index];
                if (item) {
                    artworkUrl = item.images[0]?.url;
                    name = item.name;
                    secondaryInfo = `by ${item.owner.display_name}`;
                    uri = item.uri;
                }
                break;
            default:
                console.error("Unknown search type");
                return;
        }

        // Populate or clear button based on whether item exists
        const artworkElement = button.querySelector('.button-artwork');
        const trackNameElement = button.querySelector('.button-track-name');
        const artistNameElement = button.querySelector('.button-artist-name');

        if (item) {
            if (artworkElement) {
                artworkElement.src = artworkUrl || '';
                artworkElement.alt = `${name} Artwork`;
                artworkElement.style.visibility = artworkUrl ? 'visible' : 'hidden';
            }
            if (trackNameElement) trackNameElement.textContent = name;
            if (artistNameElement) artistNameElement.textContent = secondaryInfo;

            button.dataset.trackUri = uri;
            button.style.display = 'flex';
        } else {
            if (trackNameElement) trackNameElement.textContent = '';
            if (artistNameElement) artistNameElement.textContent = '';
            if (artworkElement) {
                artworkElement.src = '';
                artworkElement.alt = 'No Artwork';
                artworkElement.style.visibility = 'hidden';
            }
            delete button.dataset.trackUri;
            button.style.display = 'flex'; // Keep button visible but empty
        }
    });
} 