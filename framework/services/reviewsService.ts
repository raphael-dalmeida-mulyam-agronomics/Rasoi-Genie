import { BuyerReview, getMealKits, updateMealKit } from './mealKitsService';

export interface ExtendedReview extends BuyerReview {
  mealKitId: string;
  mealKitName: string;
  userId: string;
  status: 'approved' | 'flagged' | 'hidden';
  reportReason?: string;
}

const INITIAL_EXTENDED_REVIEWS: ExtendedReview[] = [
  {
    id: 'rev-101',
    mealKitId: 'kit-101',
    mealKitName: 'Paneer Butter Masala Kit',
    userId: 'user_phone_9876543210',
    userName: 'Priya Sharma',
    userCity: 'Bengaluru',
    rating: 5,
    comment: 'The whole spices made my kitchen smell like a 5-star kitchen. So easy to prepare!',
    date: 'Yesterday',
    verifiedBuyer: true,
    helpfulCount: 14,
    status: 'approved',
    photoUrl:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'rev-102',
    mealKitId: 'kit-102',
    mealKitName: 'Hyderabadi Dum Chicken Biryani Kit',
    userId: 'user_phone_9123456789',
    userName: 'Rahul Verma',
    userCity: 'Noida',
    rating: 4,
    comment:
      'Delicious authentic taste. Took 35 mins instead of 30, but chicken was tender and juicy.',
    date: '3 days ago',
    verifiedBuyer: true,
    helpfulCount: 8,
    status: 'approved',
  },
  {
    id: 'rev-103',
    mealKitId: 'kit-104',
    mealKitName: 'Coastal Prawns Ghee Roast Kit',
    userId: 'user_phone_9988776655',
    userName: 'Karthik Rao',
    userCity: 'Mumbai',
    rating: 1,
    comment: 'Too fiery spicy for my family! Masala was overwhelming.',
    date: '4 days ago',
    verifiedBuyer: true,
    helpfulCount: 2,
    status: 'flagged',
    reportReason: 'Customer claims spice warning was not prominent enough.',
  },
];

let reviewsStore: ExtendedReview[] = [...INITIAL_EXTENDED_REVIEWS];

export function getReviewsByKit(kitId: string): ExtendedReview[] {
  return reviewsStore.filter((r) => r.mealKitId === kitId && r.status !== 'hidden');
}

export function getAllReviewsForModeration(): ExtendedReview[] {
  return [...reviewsStore];
}

export function addReview(
  mealKitId: string,
  mealKitName: string,
  userId: string,
  userName: string,
  userCity: string,
  rating: number,
  comment: string,
  photoUrl?: string,
): ExtendedReview {
  const newReview: ExtendedReview = {
    id: 'rev-' + Math.floor(1000 + Math.random() * 9000),
    mealKitId,
    mealKitName,
    userId,
    userName,
    userCity,
    rating,
    comment,
    date: 'Just now',
    verifiedBuyer: true,
    helpfulCount: 0,
    photoUrl,
    status: 'approved',
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
