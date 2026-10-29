/**
 * Centralized strings for the RasoiGenie Family feature.
 * Written in plain, warm Indian English. Structured for future i18n (e.g. Hindi).
 */
export const familyStrings = {
  // General & Roles
  roles: {
    owner: 'Owner',
    co_owner: 'Co-owner',
    member: 'Member',
    dependent_child: 'Child',
    dependent_senior: 'Senior',
    dependent: 'Dependent',
  },

  // Account Tab Card
  accountCard: {
    title: 'Family',
    subtitle: 'Order together. Pay once.',
    createButton: 'Create your family',
    openButton: 'Open family',
    invitesBadge: (n: number) => `Invites (${n})`,
    coOwnerPayChip: 'You can pay for the family cart',
  },

  // Create Family Sheet
  createFamily: {
    title: 'Create Your Family',
    subtitle: 'Cook authentic meals together with household loved ones.',
    nameLabel: 'Family Name',
    namePlaceholder: 'Enter family name',
    maxChars: 'Max 30 characters',
    explainers: [
      {
        icon: 'basket',
        title: 'Share a family basket',
        desc: 'Everyone in the house adds their favourite meal kits to one shared order.',
      },
      {
        icon: 'people',
        title: 'Everyone adds their own',
        desc: 'Family members pick portions, spice levels, and customisations independently.',
      },
      {
        icon: 'card',
        title: 'One seamless checkout',
        desc: 'The family owner or co-owner pays the final total once at doorstep delivery.',
      },
    ],
    ageConfirmation: 'I confirm that I am 18 years of age or older',
    submitButton: 'Create family',
    creatingButton: 'Creating family...',
    successToast: 'Family created! Start inviting your family members.',
  },

  // Family Home View (Hub)
  home: {
    headerTitle: 'Family Hub',
    capacityLabel: (current: number, max: number) => `${current} of ${max}`,
    capacityFullNote: 'Family is full (6/6 seats filled including pending invites and links)',
    membersSectionTitle: 'Family Members',
    pendingInvitesSectionTitle: 'Pending Invites & Links',
    pendingPhoneTag: 'Pending Phone Invite',
    pendingLinkTag: 'Link Not Used Yet',
    expiresIn: (timeStr: string) => `Expires in ${timeStr}`,
    joinedOn: (dateStr: string) => `Joined ${dateStr}`,
    openCartButton: 'Open Family Cart',
    leaveButton: 'Leave Family',
    coOwnerBanner: 'You can pay for the family cart',

    // Owner action buttons
    inviteAdultBtn: 'Invite Adult (+91)',
    addDependentBtn: 'Add Child or Senior',
    manageLinksBtn: 'Manage Links',
    approvalsBtn: (n: number) => `Approvals (${n})`,
    subscriptionBtn: 'Weekly Meal Subscription',
    transferOwnershipBtn: 'Transfer Ownership',
    deleteFamilyBtn: 'Delete Family',
  },

  // Invite Member Sheet (Adult by Phone)
  inviteMember: {
    title: 'Invite Adult Family Member',
    subtitle: 'Invite a spouse, sibling, or household adult with their Indian phone number.',
    phoneLabel: 'Mobile Number',
    phonePlaceholder: '98765 43210',
    consentNotice:
      'They will see your name and the meal kits you add to the family cart once they accept.',
    submitButton: 'Send Invite',
    sendingButton: 'Sending invite...',
    errors: {
      invalidPhone: 'Please enter a valid 10-digit Indian mobile number (+91).',
      familyFull: 'Your family is full (maximum 6 members & pending seats).',
      alreadyInFamily: 'This member is already part of a RasoiGenie family.',
      dailyLimit: 'Daily invitation limit reached (10 invites per day). Please try again tomorrow.',
      notRegistered: 'Ask them to sign up on RasoiGenie first, then invite them.',
    },
    successToast: 'Invitation sent successfully!',
  },

  // Add Dependent Sheet (Child or Senior Link)
  addDependent: {
    title: 'Add Child or Senior Dependent',
    subtitle: 'Create a private, one-time link so dependents can join without needing a login.',
    typeSelectorLabel: 'Who is joining?',
    childTab: 'Child',
    seniorTab: 'Senior',
    nameLabel: 'First Name',
    namePlaceholder: 'Enter first name',
    childGuardianConsent:
      'I am this child’s parent or legal guardian and I consent to their use of RasoiGenie to pick meal kits.',
    seniorConsentNote:
      'Your senior family member will confirm their own consent with simple, large text when opening the link.',
    generateBtn: 'Generate Join Link',
    generatingBtn: 'Generating link...',
    errors: {
      nameRequired: 'Please enter the dependent’s first name.',
      guardianConsentRequired: 'Parent or legal guardian consent is required for child dependents.',
      familyFull: 'Your family has reached the maximum capacity of 6 seats.',
      dailyLimit: 'Daily join link generation limit reached (5 links per day).',
    },
  },

  // Link Share Card
  linkShareCard: {
    title: 'Private Join Link Created',
    subtitle: 'Valid for 24 hours • One-time use only',
    warning: (name: string) =>
      `Only share this link with ${name}. It gives direct access without login.`,
    copyBtn: 'Copy Link',
    copiedBtn: 'Copied to Clipboard!',
    shareBtn: 'Share Link',
    doneBtn: 'Done',
  },

  // Join Links View
  linksView: {
    title: 'Manage Join Links',
    emptyTitle: 'No links created yet',
    emptySubtitle: 'Generate private one-time links to invite children or grandparents.',
    statusPending: 'Pending',
    statusUsed: 'Redeemed',
    statusExpired: 'Expired',
    statusRevoked: 'Revoked',
    revokeBtn: 'Revoke',
    reissueBtn: 'Re-issue',
    revokeConfirmTitle: 'Revoke Join Link?',
    revokeConfirmDesc: 'This link will immediately become inactive and cannot be used to join.',
    reissueConfirmTitle: 'Re-issue Join Link?',
    reissueConfirmDesc: 'A fresh 24-hour join link will be created and the old link deactivated.',
  },

  // Invite Inbox View (For adult invitees)
  inviteInbox: {
    title: 'Family Invitations',
    emptyTitle: 'No pending invitations',
    emptySubtitle: 'When a family member invites you with your phone number, it will appear here.',
    cardHeading: (ownerName: string, familyName: string) =>
      `${ownerName} invited you to join ${familyName}`,
    whatIsSharedTitle: 'What is shared:',
    whatIsSharedList: [
      'Your first name with household members',
      'Meal kits and portions you add to the family basket',
      'The family owner or co-owner pays the total bill at checkout',
    ],
    acceptBtn: 'Accept Invitation',
    declineBtn: 'Decline',
    acceptingBtn: 'Joining family...',
    errors: {
      expired: 'This invitation has expired. Ask the owner for a fresh invite.',
      familyFull: 'This family has reached its maximum member limit.',
      alreadyInFamily:
        'You are already a member of a RasoiGenie family. Leave your current family first.',
    },
  },

  // Join Landing View (Public, no login, child or senior)
  joinLanding: {
    logoTagline: 'Fresh Meal Kits • Authentic Home Cooking',
    invitedToJoin: (owner: string, family: string) => `${owner} invited you to join ${family}`,
    consentTitle: 'What is shared with your family:',
    consentItems: ['Your first name', 'Meal kits you pick for the family basket'],
    noLoginRequired: 'No passwords, phone verification, or payment details needed.',
    seniorConsentCheck: 'I agree to join this family basket on RasoiGenie',
    fontSizeToggle: 'Font Size: Large',
    joinBtn: 'Join Family',
    joiningBtn: 'Joining...',
    welcomeTitle: 'Welcome to the Family Basket!',
    welcomeSubtitle:
      'You can now browse chef-curated meal kits and add them to your household order.',
    openExploreBtn: 'Start Browsing Recipes',
    errors: {
      invalid: 'This join link is invalid or incomplete.',
      expired: 'This join link has expired (links are valid for 24 hours).',
      used: 'This join link has already been used.',
      revoked: 'This join link was revoked by the family owner.',
      full: 'The family is currently full.',
      askOwner: (owner: string) => `Ask ${owner || 'the family owner'} for a new join link.`,
    },
  },

  // Family Cart View
  cart: {
    title: 'Family Basket',
    emptyTitle: 'Your family basket is empty',
    emptySubtitle: 'Browse recipes and add authentic meal kits for your household dinner.',
    browseBtn: 'Browse Meal Kits',
    addedByYou: 'Added by You',
    addedBy: (name: string) => `Added by ${name}`,
    inOrderSection: 'In the Order (Approved)',
    awaitingApprovalSection: 'Awaiting Owner Approval',
    awaitingApprovalBadge: 'Needs Approval',
    approvedBadge: 'Approved',
    rejectedBadge: 'Not included',
    rejectionReason: (r: string) => `Reason: ${r}`,
    approveBtn: 'Approve',
    rejectBtn: 'Reject',
    rejectReasonPrompt: 'Optional rejection note (e.g. Too spicy, already ordered yesterday):',
    subtotalLabel: 'Family Total:',
    memberSubtotal: (name: string, amt: number) => `${name}’s Subtotal: ₹${amt}`,
    waitingForOwnerNote: (owner: string) =>
      `Waiting for ${owner} or a Co-owner to place the order.`,
    dependentNotice:
      'Your meal kits will be sent to the family owner for approval before checkout.',
    lockedBanner: (name: string) => `Basket locked by ${name}. Editing is paused.`,
    holdBanner: (name: string, mins: number, secs: number) =>
      `${name} is currently checking out this family order (${mins}:${secs.toString().padStart(2, '0')}).`,
    checkoutBtn: 'Proceed to Checkout',
    lockCartBtn: 'Lock Basket',
    unlockCartBtn: 'Unlock Basket',
    itemUnavailableCity: 'Item unavailable in selected delivery city. Remove to proceed.',
    priceChangedBanner: 'Some meal kit prices have been updated.',
    addItemBtn: '+ Add Meal Kit',
  },

  // Approval Queue View (Owner only)
  approvalQueue: {
    title: 'Pending Approvals',
    emptyTitle: 'Nothing waiting for approval',
    emptySubtitle: 'When child or senior dependents add meal kits, they will appear here.',
    approveAllBtn: 'Approve All Items',
    approveBtn: 'Approve',
    rejectBtn: 'Reject',
    rejectedReasonPlaceholder: 'Reason (optional)',
  },

  // Checkout View additions
  checkout: {
    familyOrderHeader: (members: number, items: number) =>
      `Family order • ${members} members • ${items} items`,
    pendingExcludedNote: (n: number) =>
      `${n} item${n > 1 ? 's' : ''} awaiting approval won't be included in this order.`,
    walletCreditsNote: 'Your personal wallet credits will be applied to this order.',
    holdTimer: (mins: number, secs: number) =>
      `Order reserved for ${mins}:${secs.toString().padStart(2, '0')}`,
    holdExpiredAlert: 'Your 10-minute checkout reservation expired. Please restart checkout.',
  },

  // Member Options Sheet
  memberOptions: {
    title: 'Member Options',
    makeCoOwner: 'Make Co-owner',
    makeCoOwnerDesc: 'Allow this adult member to pay and checkout the entire family cart.',
    removeCoOwner: 'Remove Co-owner Role',
    removeCoOwnerDesc: 'Change role back to standard adult member.',
    reissueLink: 'Re-issue Join Link',
    reissueLinkDesc: 'Send a fresh 24-hour join link for this dependent.',
    removeFromFamily: 'Remove from Family',
    removeFromFamilyDesc: 'Remove this person from the family and cancel their items.',
    removeConfirmTitle: (name: string) => `Remove ${name} from family?`,
    removeConfirmDesc: 'They will no longer have access to the family cart or household recipes.',
  },

  // Leave Family Sheet
  leaveFamily: {
    title: 'Leave Family',
    desc: 'Are you sure you want to leave this family? You will no longer share the family basket or orders.',
    confirmBtn: 'Leave Family',
    cancelBtn: 'Stay in Family',
  },

  // Transfer Ownership Sheet
  transferOwnership: {
    title: 'Transfer Family Ownership',
    subtitle: 'Select an adult member to become the new owner of this family.',
    confirmBtn: 'Transfer Ownership',
    cancelBtn: 'Cancel',
    warning: 'You will step down as owner and become a regular family member.',
  },

  // Delete Family Sheet
  deleteFamily: {
    title: 'Delete Family',
    subtitle:
      'This will permanently disband the family, remove all members, and cancel the family basket.',
    confirmBtn: 'Delete Family Permanently',
    cancelBtn: 'Cancel',
  },
};
