export default {
	quizTitleMap: {},
	currentPage: 1,
	totalPages: null,
	fetchingPromises: {}, // To prevent duplicate fetches for same ID
	
	// Initialize: Fetch first page on load
	initializeOnLoad: async () => {
		console.log("Initializing quiz titles...");
		await this.fetchQuizPage(1);
		console.log(`Loaded page 1, total ${Object.keys(this.quizTitleMap).length} quizzes cached`);
	},
	
	// Fetch a specific page and store in map
	fetchQuizPage: async (page) => {
		const url = `https://staging-api.quizboxbd.com/api/v1/quiz?page=${page}`;
		
		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			
			const data = await response.json(); // YOU WERE MISSING THIS!
			const quizzes = data.data?.data || [];
			
			console.log("Response:", data);
			console.log(`Page ${page}: Loaded ${quizzes.length} quizzes`);
			
			// Store all quizzes from this page
			quizzes.forEach(quiz => {
				this.quizTitleMap[quiz._id] = quiz.title;
			});
			
			this.currentPage = page;
			this.totalPages = data.data?.totalPages;
			
			return {
				success: true,
				hasNext: data.data?.hasNext,
				quizCount: quizzes.length
			};
		} catch (error) {
			console.error(`Error fetching quiz page ${page}:`, error);
			return { success: false, hasNext: false };
		}
	},
	
	// Main function: Get title by quizId, fetch next pages if needed
	getQuizTitle: async (quizId) => {
		if (!quizId) return "N/A";
		
		// If already in map, return immediately
		if (this.quizTitleMap[quizId]) {
			return this.quizTitleMap[quizId];
		}
		
		// Prevent duplicate fetches for the same ID
		if (this.fetchingPromises[quizId]) {
			return await this.fetchingPromises[quizId];
		}
		
		// Create promise for this fetch
		this.fetchingPromises[quizId] = (async () => {
			console.log(`Quiz ID ${quizId} not found, fetching next pages...`);
			
			// Keep fetching next pages until found or no more pages
			let nextPage = this.currentPage + 1;
			let maxAttempts = 50;
			let attempts = 0;
			
			while (attempts < maxAttempts) {
				// Check if we've reached the end
				if (this.totalPages && nextPage > this.totalPages) {
					console.warn(`Quiz ID ${quizId} not found in any page`);
					delete this.fetchingPromises[quizId];
					return `Unknown (${quizId})`;
				}
				
				// Fetch next page
				console.log(`Fetching page ${nextPage} to find quiz ${quizId}...`);
				const result = await this.fetchQuizPage(nextPage);
				
				// Check if we found it
				if (this.quizTitleMap[quizId]) {
					console.log(`✓ Found quiz ${quizId}: ${this.quizTitleMap[quizId]}`);
					delete this.fetchingPromises[quizId];
					return this.quizTitleMap[quizId];
				}
				
				// Stop if no more pages
				if (!result.hasNext) {
					console.warn(`Quiz ID ${quizId} not found, no more pages`);
					delete this.fetchingPromises[quizId];
					return `Unknown (${quizId})`;
				}
				
				nextPage++;
				attempts++;
			}
			
			delete this.fetchingPromises[quizId];
			return `Unknown (${quizId})`;
		})();
		
		return await this.fetchingPromises[quizId];
	},
	
	// Sync version (returns cached only, shows loading if not found)
	getQuizTitleSync: (quizId) => {
		if (!quizId) return "N/A";
		
		if (this.quizTitleMap[quizId]) {
			return this.quizTitleMap[quizId];
		}
		
		// Trigger async fetch but return loading message
		this.getQuizTitle(quizId);
		return "Loading...";
	}
}