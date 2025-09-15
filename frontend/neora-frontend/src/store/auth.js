import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      setUser: (user) => {
        console.log('AuthStore: setUser called with:', user);
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      logout: () => {
        console.log('AuthStore: logout called');
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      },
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      // Check if user is authenticated
      checkAuth: () => {
        const { user } = get();
        return !!user;
      },
      
      // Clear authentication state (useful for email verification)
      clearAuth: () => {
        console.log('AuthStore: clearAuth called');
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      }
    }),
    {
      name: 'neora-auth',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        console.log('AuthStore: Rehydrated from storage:', state);
        
        // Check if we're coming from email verification
        const urlParams = new URLSearchParams(window.location.search);
        const messageParam = urlParams.get('message');
        const errorParam = urlParams.get('error');
        
        if (messageParam || errorParam) {
          console.log('AuthStore: Email verification detected, clearing authentication state');
          // Clear the state immediately after rehydration
          setTimeout(() => {
            useAuthStore.getState().clearAuth();
          }, 0);
        }
      },
    }
  )
);

export default useAuthStore;

