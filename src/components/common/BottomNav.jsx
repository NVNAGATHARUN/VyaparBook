import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, FileText, Package, BarChart2 } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home, exact: true },
  { path: '/parties', label: 'Parties', icon: Users },
  { path: '/deals', label: 'Deals', icon: FileText },
  { path: '/stock', label: 'Stock', icon: Package },
  { path: '/reports', label: 'Reports', icon: BarChart2 },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50 safe-bottom">
      <div className="flex items-stretch justify-around max-w-md mx-auto">
        {navItems.map(({ path, label, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-3 flex-1 transition-all duration-200 ${
                isActive
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-green-50' : ''
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-green-600' : 'text-gray-400'}
                  />
                </div>
                <span
                  className={`text-xs mt-0.5 font-medium ${
                    isActive ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
