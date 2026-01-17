export default {
  tournamentNameMap: {},
  currentPage: 0,
  totalPages: null,
  fetchingPromises: {}, // To prevent duplicate fetches for same ID
  
  // Initialize: Fetch first page on load
  initializeOnLoad: async () => {
    console.log("Initializing tournament names...");
    await this.fetchTournamentPage(1);
    console.log(`Loaded page 1, total ${Object.keys(this.tournamentNameMap).length} tournaments cached`);
  },
  
  // Fetch a specific page and store in map
  fetchTournamentPage: async (page) => {
    try {
      const response = await getTournaments.run({ page: page });
      const tournaments = response.data?.data || [];
      
      // Store all tournaments from this page
      tournaments.forEach(tournament => {
        this.tournamentNameMap[tournament._id] = tournament.name;
      });
      
      this.currentPage = page;
      this.totalPages = response.data?.totalPages;
      
      return {
        success: true,
        hasNext: response.data?.hasNext,
        tournamentCount: tournaments.length
      };
    } catch (error) {
      console.error(`Error fetching tournament page ${page}:`, error);
      return { success: false, hasNext: false };
    }
  },
  
  // Main function: Get name by tournamentId, fetch next pages if needed
  getTournamentName: async (tournamentId) => {
    if (!tournamentId) return "N/A";
    
    // If already in map, return immediately
    if (this.tournamentNameMap[tournamentId]) {
      return this.tournamentNameMap[tournamentId];
    }
    
    // Prevent duplicate fetches for the same ID
    if (this.fetchingPromises[tournamentId]) {
      return await this.fetchingPromises[tournamentId];
    }
    
    // Create promise for this fetch
    this.fetchingPromises[tournamentId] = (async () => {
      console.log(`Tournament ID ${tournamentId} not found, fetching next pages...`);
      
      // Keep fetching next pages until found or no more pages
      let nextPage = this.currentPage + 1;
      let maxAttempts = 50; // Safety limit
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        // Check if we've reached the end
        if (this.totalPages && nextPage > this.totalPages) {
          console.warn(`Tournament ID ${tournamentId} not found in any page`);
          delete this.fetchingPromises[tournamentId];
          return `Unknown (${tournamentId})`;
        }
        
        // Fetch next page
        console.log(`Fetching page ${nextPage} to find tournament ${tournamentId}...`);
        const result = await this.fetchTournamentPage(nextPage);
        
        // Check if we found it
        if (this.tournamentNameMap[tournamentId]) {
          console.log(`✓ Found tournament ${tournamentId}: ${this.tournamentNameMap[tournamentId]}`);
          delete this.fetchingPromises[tournamentId];
          return this.tournamentNameMap[tournamentId];
        }
        
        // Stop if no more pages
        if (!result.hasNext) {
          console.warn(`Tournament ID ${tournamentId} not found, no more pages`);
          delete this.fetchingPromises[tournamentId];
          return `Unknown (${tournamentId})`;
        }
        
        nextPage++;
        attempts++;
      }
      
      delete this.fetchingPromises[tournamentId];
      return `Unknown (${tournamentId})`;
    })();
    
    return await this.fetchingPromises[tournamentId];
  },
  
  // Sync version (returns cached only, shows loading if not found)
  getTournamentNameSync: (tournamentId) => {
    if (!tournamentId) return "N/A";
    
    if (this.tournamentNameMap[tournamentId]) {
      return this.tournamentNameMap[tournamentId];
    }
    
    // Trigger async fetch but return loading message
    this.getTournamentName(tournamentId);
    return "Loading...";
  }
}