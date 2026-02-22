import api from './api';

export const analyticsService = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/analytics/summary');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return empty data instead of mock data
      return {
        totalPnL: 0,
        totalPnLChange: 0,
        winRate: 0,
        winRateChange: 0,
        avgRiskReward: 0,
        avgRiskRewardChange: 0,
        drawdown: 0,
        drawdownChange: 0,
        weeklyPnL: []
      };
    }
  },

  getEquityCurve: async (period = '1M') => {
    try {
      const response = await api.get(`/analytics/equity-curve?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch equity curve:', error);
      return [];
    }
  },

  getSessionStats: async () => {
    try {
      const response = await api.get('/analytics/sessions');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
      return [];
    }
  },

  getEmotionalAnalysis: async () => {
    try {
      const response = await api.get('/analytics/emotions');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch emotional analysis:', error);
      return { emotions: [] };
    }
  },

  getWinRateByStrategy: async () => {
    try {
      const response = await api.get('/analytics/strategies');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch strategy stats:', error);
      return [];
    }
  },

  getRiskMetrics: async () => {
    try {
      const response = await api.get('/analytics/summary');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch risk metrics:', error);
      return {
        currentDrawdown: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        avgRiskPerTrade: 0
      };
    }
  },

  getCalendarHeatmap: async (month, year) => {
    try {
      const response = await api.get(`/analytics/daily-pnl?month=${month}&year=${year}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch calendar heatmap:', error);
      return [];
    }
  }
};
