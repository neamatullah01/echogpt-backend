import {
  SearchProviderAdapter,
  SearchResult,
} from '../interfaces/search-provider.interface.js';

export class MockSearchAdapter implements SearchProviderAdapter {
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const results: SearchResult[] = [];
    for (let i = 1; i <= limit; i++) {
      results.push({
        title: `Mock Result ${i} for "${query}"`,
        url: `https://example.com/result/${i}`,
        snippet: `This is a simulated search result for the query: ${query}. It contains useful information related to the search context.`,
      });
    }

    return results;
  }
}
