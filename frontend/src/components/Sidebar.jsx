import { FiBarChart2, FiDatabase, FiHome, FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const navItems = [
    { path: "/dashboard", icon: FiHome, label: "Dashboard" },
    { path: "/ingestion", icon: FiDatabase, label: "Ingestion" },
    { path: "/query", icon: FiSearch, label: "Query" },
    { path: "/analytics", icon: FiBarChart2, label: "Analytics" },
  ];

  return (
    <aside className="w-64 bg-gray-800 min-h-screen text-white">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-8">SQS GMN</h2>

        <nav className="space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
