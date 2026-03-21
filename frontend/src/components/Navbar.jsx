import { FiBell, FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800">
            SQS GMN Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          <button className="relative p-2 text-gray-600 hover:text-gray-800">
            <FiBell className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <FiUser className="w-6 h-6 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500">{user?.role || "Admin"}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
