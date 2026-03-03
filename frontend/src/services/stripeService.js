import api from './api';

export const stripeService = {
    createCheckoutSession: async (priceId) => {
        try {
            const response = await api.post('/stripe/checkout', { priceId });
            return response.data.data;
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            throw error;
        }
    },

    createPortalSession: async () => {
        try {
            const response = await api.post('/stripe/portal');
            return response.data.data;
        } catch (error) {
            console.error('Failed to create portal session:', error);
            throw error;
        }
    },

    getSubscriptionStatus: async () => {
        try {
            const response = await api.get('/stripe/subscription');
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch subscription status:', error);
            throw error;
        }
    }
};
