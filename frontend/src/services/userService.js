import api from './api';

export const userService = {
    getProfile: async () => {
        try {
            const response = await api.get('/users/profile');
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            throw error;
        }
    },

    updatePreferences: async (preferences) => {
        try {
            const response = await api.patch('/users/preferences', preferences);
            return response.data.data;
        } catch (error) {
            console.error('Failed to update preferences:', error);
            throw error;
        }
    },

    changePassword: async (passwords) => {
        try {
            const response = await api.patch('/users/password', passwords);
            return response.data.data;
        } catch (error) {
            console.error('Failed to change password:', error);
            throw error;
        }
    }
};
