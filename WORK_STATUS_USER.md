# Work Status — What Changed (User View) Since Last Commit

- App layout and all tab screens updated (navigation, admin, cart, chef, orders, search, login)
- Admin dashboard overhauled (+602 lines): new inventory management, meal-kit editing, ingredient categories
- Inventory system rebuilt: split combined ingredients, category detection fixed, real-time deduction
- Onboarding wizard expanded (+372): multi-diet selection, preference persistence, wizard flows
- Dietary preferences modal expanded (+307): more diet options and settings persistence
- Address book and profile views updated (+296 / +70): address management, user preferences
- Home screen updated (+46): layout and content adjustments
- Meal-kit and inventory backend services updated: seed sync, order lifecycle, dish origins
- Search and filtering fixed: black borders removed, exact-match first, debounced search, immediate query
- Authentication and navigation guards updated across auth features and framework contexts
- All framework tests and theme/UI components adjusted for consistency
- Changes remain uncommitted in working tree; branch `main` at commit 3c3e545

Co-Authored-By: Claude Code <noreply@anthropic.com>
