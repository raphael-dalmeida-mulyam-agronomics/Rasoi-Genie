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
