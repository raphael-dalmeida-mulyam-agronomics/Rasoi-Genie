import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistContextValue {
  wishlistIds: string[];
  addToWishlist: (kitId: string) => void;
  removeFromWishlist: (kitId: string) => void;
  toggleWishlist: (kitId: string) => void;
  isInWishlist: (kitId: string) => boolean;
  wishlistCount: number;
}

const WISHLIST_STORAGE_KEY = '@rasoi_wishlist_ids_v1';

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>(['kit-101', 'kit-104']);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      .then((saved) => {
        if (mounted && saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setWishlistIds(parsed);
            }
          } catch {}
        }
      })
      .finally(() => {
        if (mounted) setIsLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds)).catch(() => {});
    }
  }, [wishlistIds, isLoaded]);

  const addToWishlist = (kitId: string) => {
    setWishlistIds((prev) => (prev.includes(kitId) ? prev : [...prev, kitId]));
  };

  const removeFromWishlist = (kitId: string) => {
    setWishlistIds((prev) => prev.filter((id) => id !== kitId));
  };

  const toggleWishlist = (kitId: string) => {
    setWishlistIds((prev) =>
      prev.includes(kitId) ? prev.filter((id) => id !== kitId) : [...prev, kitId],
    );
  };

  const isInWishlist = (kitId: string) => wishlistIds.includes(kitId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        wishlistCount: wishlistIds.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
