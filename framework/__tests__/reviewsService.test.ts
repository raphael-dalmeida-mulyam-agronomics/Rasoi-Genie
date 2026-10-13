import { addReview, getReviewsByKit, hasUserReviewedRecently } from '../services/reviewsService';

describe('Reviews Service & Cook Mode Review Flow', () => {
  const kitId = 'test-dal-makhani';
  const kitName = 'Dal Makhani Gourmet Kit';
  const userId = 'user_foodie_101';
  const userName = 'Priya Sharma';
  const userCity = 'Mumbai';

  it('allows user to submit review with star rating only without writing any comment', () => {
    const review = addReview(
      kitId,
      kitName,
      userId,
      userName,
      userCity,
      5,
      undefined, // No comment written
      undefined,
    );

    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.comment).toBe('');
    expect(review.mealKitId).toBe(kitId);

    const kitReviews = getReviewsByKit(kitId);
    expect(kitReviews.length).toBeGreaterThanOrEqual(1);
    expect(kitReviews.some((r) => r.id === review.id)).toBe(true);
  });

  it('allows user to attach an uploaded photo image uri with their review', () => {
    const photoKitId = 'test-butter-paneer';
    const photoUri =
      'file:///var/mobile/Containers/Data/Application/123/Library/Caches/dish-photo.jpg';

    const review = addReview(
      photoKitId,
      'Paneer Butter Masala',
      'user_photographer_202',
      'Kabir Roy',
      'Bengaluru',
      4,
      '', // Star review only with photo
      photoUri,
    );

    expect(review.photoUrl).toBe(photoUri);
    expect(review.rating).toBe(4);
    expect(review.comment).toBe('');
  });

  it('prevents user from publishing multiple reviews for the same meal kit in a short span of time', () => {
    const duplicateKitId = 'test-biryani-kit';
    const singleUserId = 'user_duplicate_test';

    // First review succeeds
    const firstReview = addReview(
      duplicateKitId,
      'Hyderabadi Dum Biryani',
      singleUserId,
      'Same User',
      'Hyderabad',
      5,
    );
    expect(firstReview).toBeDefined();

    // Check rate limit check
    expect(hasUserReviewedRecently(duplicateKitId, singleUserId, 60)).toBe(true);

    // Second review within short time span is prevented / returns existing
    const secondReview = addReview(
      duplicateKitId,
      'Hyderabadi Dum Biryani',
      singleUserId,
      'Same User',
      'Hyderabad',
      1, // Attempting to spam another review with 1 star
      'Should not duplicate',
    );

    // It should return the first review and not add another row to store
    expect(secondReview.id).toBe(firstReview.id);
    expect(secondReview.rating).toBe(5); // Retained original rating

    const reviews = getReviewsByKit(duplicateKitId).filter((r) => r.userId === singleUserId);
    expect(reviews.length).toBe(1);
  });
});
