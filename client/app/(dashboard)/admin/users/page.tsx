'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Users, Shield, Eye, UserCog } from 'lucide-react';

interface User {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  department: string | null;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ADMIN: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: Shield },
  OWNER: { label: 'Responsable', color: 'bg-blue-100 text-blue-700', icon: UserCog },
  VIEWER: { label: 'Observador', color: 'bg-gray-100 text-gray-700', icon: Eye },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Usuarios del Sistema
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Usuarios registrados en el sistema
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="animate-pulse p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Departamento</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.VIEWER;
                const Icon = roleConfig.icon;

                return (
                  <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{user.display_name}</p>
                      <p className="text-gray-500 text-xs">{user.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${roleConfig.color} flex items-center gap-1 w-fit`}>
                        <Icon className="h-3 w-3" />
                        {roleConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {user.department || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
