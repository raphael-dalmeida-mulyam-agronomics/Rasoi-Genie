/**
 * Centralized strings for the Weekly Meal Subscriptions feature.
 * Plain, warm Indian English following RasoiGenie design tone.
 */
export const subscriptionStrings = {
  common: {
    featureTitle: 'Weekly Meal Subscriptions',
    subtitle: 'Chef-curated dinners delivered fresh every week. Skip, swap, or cancel anytime.',
    perMemberPerWeek: (price: number) => `₹${price}/member/wk`,
    weeklyTotal: (amount: number) => `₹${amount.toLocaleString('en-IN')}/week`,
    memberCountBadge: (n: number) => `${n} covered member${n > 1 ? 's' : ''}`,
    statusActive: 'ACTIVE',
    statusPaused: 'PAUSED',
    statusPending: 'PENDING',
    statusCancelled: 'CANCELLED',
    statusExpired: 'EXPIRED',
    nextDeliveryNote: (dateStr: string) => `Next Box: ${dateStr} • Monday Morning Delivery`,
  },

  plans: {
    chooseTitle: 'Choose Your Weekly Plan',
    standardTab: 'Standard Plans',
    customTab: 'Custom Schedule',
    highProteinTitle: 'High Protein Power',
    ketoTitle: 'Keto Low-Carb Gourmet',
    veganTitle: '100% Plant-Based Vegan',
    kidsTitle: 'Kids Healthy Box',
    customTitle: 'Fully Custom 7-Day Plan',
    customSubtitle: 'Hand-pick your favourite recipe or kit for each day of the week.',
    applyStandardPlanBtn: 'Apply Standard Plan',
  },

  perMember: {
    applySamePlanToAll: 'Apply same plan to everyone',
    applySamePlanDesc:
      'Copies this plan to all covered members. You can still customize individual members afterwards.',
    shareOwnerPlan: "Share Owner's Plan",
    sharedOwnerPlanBadge: 'Sharing Owner Plan',
    viewOnlyNotice:
      'Only the family owner can modify plans or pay. You are viewing your assigned weekly plan.',
    memberPlanSelectorTitle: (name: string) => `${name}'s Plan`,
  },

  familyCalendar: {
    hubCardTitle: 'Family Meal Subscription',
    hubCardSubtitle: 'Assign recipes per member for the week. Pay once upfront.',
    hubCardBtn: 'Manage Meal Subscription',
    viewPlanBtn: 'View Active Subscription',
    ownerOnlyNotice: 'Only the family owner can subscribe, assign recipes, or modify billing.',
    planHeading: 'Weekly Meal Plan',
    planSubtitle: 'Tap any day to see or change what each member is eating.',
    memberPlansHeading: 'Member plans',
    applyPlanToAllConfirmTitle: (planName: string) => `Apply ${planName} to Everyone?`,
    applyPlanToAllConfirmMsg:
      'This will update weekly meals for all covered family members. You can still customize individual members afterwards.',
    overwriteCustomPicksTitle: 'Change Plan & Overwrite Meals?',
    overwriteCustomPicksMsg: (name: string) =>
      `${name} has custom meal picks that will be updated to match the selected plan. Do you want to proceed?`,
    totalPerWeekSummary: (amount: number, count: number) =>
      `Total per week: ₹${amount.toLocaleString('en-IN')} for ${count} member${count > 1 ? 's' : ''}`,
    calendarTitle: 'Weekly Meal Schedule',
    calendarSubtitle: 'Tap any day cell to assign, swap, or clear that meal kit.',
    memberRowLabel: (name: string, roleOrType: string) => `${name} (${roleOrType})`,
    assignMealTitle: (memberName: string, dayName: string) =>
      `Assign ${dayName} Meal for ${memberName}`,
    clearMealBtn: 'Clear Day',
    changeMealBtn: 'Change Recipe',
    standardPlanChip: (planName: string) => `Plan: ${planName}`,
    customPlanChip: 'Custom Plan',
    conflictWarningTitle: 'Dietary Preference Conflict',
    conflictWarningSubtitle: 'This recipe conflicts with saved preferences:',
  },

  pauseCalendar: {
    modalTitle: 'Pause Deliveries',
    modalSubtitle:
      'Tap days or a range to pause deliveries. We will extend your subscription period accordingly.',
    allowanceBadge: (used: number, total: number) =>
      `${Math.max(0, total - used)} of ${total} paused days left`,
    rangesBadge: (used: number, max: number) =>
      `${Math.max(0, max - used)} of ${max} pause windows left`,
    cutoffNote: 'Days within 48 hours are locked because cooking boxes are already being packed.',
    pauseTargetLabel: 'Pause scope:',
    targetWholeFamily: 'Whole Family',
    targetMemberPrefix: 'Member: ',
    startDateLabel: 'Pause Start Date',
    endDateLabel: 'Pause End Date',
    confirmPauseBtn: 'Save Pause Window',
    cancelBtn: 'Close',
    pausedBadge: 'Paused',
    activePausesTitle: 'Active Pauses This Period',
    noActivePauses: 'No pauses scheduled for this period.',
    periodExtendedNotice: (days: number, newEnd: string) =>
      `Period extended by ${days} day${days > 1 ? 's' : ''} to ${newEnd}.`,
  },

  autoRenew: {
    title: 'Weekly Auto-Renewal',
    enabledDescription: (amount: number, dateStr: string) =>
      `Next charge of ₹${amount.toLocaleString('en-IN')} on ${dateStr}. You can pause or cancel anytime.`,
    disabledDescription: (dateStr: string) =>
      `Auto-renew is turned off. Your deliveries will stop on ${dateStr} when the current period ends.`,
    checkoutToggleLabel: 'Auto-renew every week (skip or cancel anytime)',
    toggleLabel: 'Auto-renew weekly',
    turnOffConfirmTitle: 'Turn Off Auto-Renewal?',
    turnOffConfirmMsg:
      'Your subscription will remain active until the end of this billing period, and will not renew automatically.',
  },

  pricing: {
    pricingTitle: 'Weekly Pricing Summary',
    ratePerMember: 'Rate per member / week:',
    coveredMembers: 'Covered members count:',
    subtotal: 'Weekly subtotal:',
    walletCreditApplied: 'Wallet credits applied:',
    totalPayable: 'Total Payable Upfront:',
    prorationNotice: (amount: number, days: number) =>
      `Prorated charge: ₹${amount} for remaining ${days} day${days > 1 ? 's' : ''} in the current week.`,
    policyRemovalNote: 'Removed members will stop receiving meals starting next Monday.',
  },

  checkout: {
    payUpfrontBtn: (amount: number) => `Pay & Activate (₹${amount.toLocaleString('en-IN')})`,
    resumeBtn: 'Resume Weekly Box',
    pauseBtn: 'Pause Deliveries',
    cancelBtn: 'Cancel Subscription',
    confirmPauseTitle: 'Pause Weekly Subscription?',
    confirmPauseMsg:
      'Deliveries will be put on hold starting next Monday. You will not be charged.',
    confirmCancelTitle: 'Cancel Subscription?',
    confirmCancelMsg:
      'Are you sure you want to cancel your weekly box? You can resubscribe anytime.',
    activeSuccessTitle: 'Subscription Active!',
    activeSuccessMsg:
      'Your weekly meal subscription is confirmed. Fresh gourmet boxes deliver every Monday.',
  },

  popup: {
    title: 'Never Worry About "What to Cook Tonight"',
    subtitle:
      'Subscribe to weekly fresh meal boxes for you and your family. Save up to 25% with free delivery and priority morning slots.',
    bullet1: 'Pre-portioned fresh ingredients & whole chef-ground masalas',
    bullet2: 'High Protein, Keto, Vegan, Kids or 100% custom day-by-day plans',
    bullet3: 'Pause, swap, or cancel anytime with zero cancellation fees',
    viewPlansBtn: 'View Subscription Plans',
    maybeLaterBtn: 'Maybe Later',
  },

  admin: {
    title: 'Weekly Subscriptions',
    subtitle: 'Monitor and manage active recurring meal boxes across India operating hubs.',
    filterAll: 'All Subscriptions',
    filterIndividual: 'Individual',
    filterFamily: 'Family',
    filterActive: 'Active',
    filterPaused: 'Paused',
    filterExpired: 'Expired',
    filterCancelled: 'Cancelled',
    autoRenewOn: 'Auto-Renew On',
    autoRenewOff: 'Auto-Renew Off',
    cancelSubBtn: 'Cancel Subscription',
    confirmCancelTitle: 'Admin Cancellation',
    confirmCancelMsg: (customer: string) =>
      `Are you sure you want to cancel ${customer}'s weekly subscription? Deliveries and renewals will cease immediately.`,
    detailMembersTitle: 'Covered Members & Plans',
    detailPausesTitle: 'Pause History',
    detailBillingTitle: 'Billing & Renewal',
  },
};
