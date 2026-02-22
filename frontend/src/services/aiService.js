import api from './api';

export const aiService = {
  getInsights: async () => {
    try {
      const response = await api.get('/ai/insights');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      // Return empty data instead of mock data
      return {
        insights: []
      };
    }
  },

  getTradeAnalysis: async (tradeId) => {
    try {
      const response = await api.get(`/ai/trade-analysis/${tradeId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch trade analysis:', error);
      // Return empty data instead of mock data
      return {
        qualityScore: 0,
        riskDisciplineRating: 0,
        emotionalDisciplineRating: 0,
        mistakeDetected: false,
        behavioralFlags: []
      };
    }
  },

  getPatternDetection: async () => {
    try {
      const response = await api.get('/ai/patterns');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch pattern detection:', error);
      return {
        patterns: []
      };
    }
  },

  getEmotionalAnalysis: async () => {
    try {
      const response = await api.get('/ai/emotional-analysis');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch emotional analysis:', error);
      return {
        emotions: []
      };
    }
  },

  getRecommendations: async () => {
    try {
      const response = await api.get('/ai/recommendations');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      return {
        recommendations: []
      };
    }
  },

  generateWeeklyReport: async () => {
    try {
      const response = await api.post('/ai/weekly-report');
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      return {
        report: "Unable to generate AI weekly report at this time.",
        recommendations: [],
        analysis: ""
      };
    }
  }
};
