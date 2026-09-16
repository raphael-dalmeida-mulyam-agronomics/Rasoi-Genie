export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'customer';
  status: 'active' | 'suspended';
  city: string;
  ordersCount: number;
  totalSpend: number;
  joinedDate: string;
  lastActive: string;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'u-1',
    name: 'Raphael D’Almeida',
    email: 'admin@mulyam.in',
    phone: '+91 98765 43210',
    role: 'admin',
    status: 'active',
    city: 'Bengaluru',
    ordersCount: 28,
    totalSpend: 11450,
    joinedDate: 'Jan 2026',
    lastActive: 'Just now',
  },
  {
    id: 'u-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 98765 12345',
    role: 'customer',
    status: 'active',
    city: 'Bengaluru',
    ordersCount: 14,
    totalSpend: 5490,
    joinedDate: 'Feb 2026',
    lastActive: '2 hours ago',
  },
  {
    id: 'u-3',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+91 91234 56789',
    role: 'customer',
    status: 'active',
    city: 'Noida',
    ordersCount: 9,
    totalSpend: 3820,
    joinedDate: 'Mar 2026',
    lastActive: '1 day ago',
  },
  {
    id: 'u-4',
    name: 'Spam Account',
    email: 'fake.bot@suspicious.com',
    phone: '+91 99999 00000',
    role: 'customer',
    status: 'suspended',
    city: 'Unknown',
    ordersCount: 0,
    totalSpend: 0,
    joinedDate: 'Sep 2026',
    lastActive: '5 days ago',
  },
];

let usersStore: ManagedUser[] = [...INITIAL_USERS];

export function getManagedUsers(): ManagedUser[] {
  return [...usersStore];
}

export function toggleUserStatus(userId: string): void {
  usersStore = usersStore.map((u) =>
    u.id === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u,
  );
}

export function toggleUserAdminRole(userId: string): void {
  usersStore = usersStore.map((u) => {
    if (u.id === userId) {
      const newRole = u.role === 'admin' ? 'customer' : 'admin';
      return { ...u, role: newRole };
    }
    return u;
  });
}
