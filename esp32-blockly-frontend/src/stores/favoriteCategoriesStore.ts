/**
 * お気に入りカテゴリ管理ストア
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteCategoriesState {
  favorites: string[]; // お気に入りカテゴリのID配列
  toggleFavorite: (categoryId: string) => void;
  isFavorite: (categoryId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteCategoriesStore = create<FavoriteCategoriesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (categoryId: string) => {
        set((state) => {
          const newFavorites = state.favorites.includes(categoryId)
            ? state.favorites.filter((id) => id !== categoryId)
            : [...state.favorites, categoryId];
          return { favorites: newFavorites };
        });
      },

      isFavorite: (categoryId: string) => {
        return get().favorites.includes(categoryId);
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'favorite-categories-storage',
    }
  )
);
