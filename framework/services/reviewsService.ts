import { BuyerReview, getMealKits, updateMealKit } from './mealKitsService';

export interface ExtendedReview extends BuyerReview {
  mealKitId: string;
  mealKitName: string;
  userId: string;
  status: 'approved' | 'flagged' | 'hidden';
  reportReason?: string;
  createdAt?: number;
}

const INITIAL_EXTENDED_REVIEWS: ExtendedReview[] = [];

let reviewsStore: ExtendedReview[] = [...INITIAL_EXTENDED_REVIEWS];

export function getReviewsByKit(kitId: string): ExtendedReview[] {
  return reviewsStore.filter((r) => r.mealKitId === kitId && r.status !== 'hidden');
}

export function getAllReviewsForModeration(): ExtendedReview[] {
  return [...reviewsStore];
}

/**
 * Checks if a user has already reviewed a meal kit recently (within specified minutes, default 60m).
 * Prevents publishing duplicate reviews for the same meal kit in a short span of time.
 */
export function hasUserReviewedRecently(
  mealKitId: string,
  userId: string,
  withinMinutes = 60,
): boolean {
  if (!userId || userId === 'guest-user') {
    // For anonymous/guest users, check if any guest review was published for this kit within the cutoff
    const cutoff = Date.now() - withinMinutes * 60 * 1000;
    return reviewsStore.some(
      (r) =>
        r.mealKitId === mealKitId &&
        r.userId === userId &&
        (r.createdAt ? r.createdAt > cutoff : false),
    );
  }
  const cutoff = Date.now() - withinMinutes * 60 * 1000;
  return reviewsStore.some(
    (r) =>
      r.mealKitId === mealKitId &&
      r.userId === userId &&
      (r.createdAt ? r.createdAt > cutoff : false),
  );
}

export function addReview(
  mealKitId: string,
  mealKitName: string,
  userId: string,
  userName: string,
  userCity: string,
  rating: number,
  comment?: string,
  photoUrl?: string,
): ExtendedReview {
  const existingRecent = hasUserReviewedRecently(mealKitId, userId, 60);
  if (existingRecent) {
    const existing = reviewsStore.find((r) => r.mealKitId === mealKitId && r.userId === userId);
    if (existing) return existing;
  }

  const newReview: ExtendedReview = {
    id: 'rev-' + Math.floor(1000 + Math.random() * 9000),
    mealKitId,
    mealKitName,
    userId,
    userName,
    userCity,
    rating,
    comment: (comment || '').trim(),
    date: 'Just now',
    verifiedBuyer: true,
    helpfulCount: 0,
    photoUrl,
    status: 'approved',
    createdAt: Date.now(),
  };

  reviewsStore = [newReview, ...reviewsStore];

  // Recalculate kit rating
  const kitReviews = reviewsStore.filter(
    (r) => r.mealKitId === mealKitId && r.status === 'approved',
  );
  if (kitReviews.length > 0) {
    const avg = kitReviews.reduce((sum, r) => sum + r.rating, 0) / kitReviews.length;
    updateMealKit(mealKitId, {
      rating: parseFloat(avg.toFixed(1)),
      reviewCount: kitReviews.length,
    });
  }

  return newReview;
}

export function updateReview(
  reviewId: string,
  rating: number,
  comment: string,
  photoUrl?: string,
): void {
  reviewsStore = reviewsStore.map((r) =>
    r.id === reviewId ? { ...r, rating, comment, photoUrl, date: 'Edited just now' } : r,
  );
}

export function deleteReview(reviewId: string): void {
  reviewsStore = reviewsStore.filter((r) => r.id !== reviewId);
}

// Admin moderation actions
export function moderateReview(reviewId: string, status: 'approved' | 'hidden' | 'flagged'): void {
  reviewsStore = reviewsStore.map((r) => (r.id === reviewId ? { ...r, status } : r));
}
