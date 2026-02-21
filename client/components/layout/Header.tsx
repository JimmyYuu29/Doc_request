'use client';

import { useAuthStore } from '@/store';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Sistema de Peticion de Documentacion
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <div className="hidden sm:block">
                <p className="font-medium text-gray-900">{user.display_name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title="Cerrar sesion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
