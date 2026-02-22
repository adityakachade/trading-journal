import api from './api';

export const tradeService = {
  getAllTrades: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/trades?${params}`);
    return response.data;
  },

  getTradeById: async (id) => {
    const response = await api.get(`/trades/${id}`);
    return response.data;
  },

  createTrade: async (tradeData) => {
    const response = await api.post('/trades', tradeData);
    return response.data;
  },

  updateTrade: async (id, tradeData) => {
    const response = await api.put(`/trades/${id}`, tradeData);
    return response.data;
  },

  deleteTrade: async (id) => {
    const response = await api.delete(`/trades/${id}`);
    return response.data;
  },

  getTradeStats: async () => {
    const response = await api.get('/trades/stats');
    return response.data;
  },

  exportTrades: async (format = 'pdf') => {
    const response = await api.get(`/trades/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
