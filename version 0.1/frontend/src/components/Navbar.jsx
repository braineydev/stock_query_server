import ThemeToggle from "./ThemeToggle";
import Notifications from "./Notifications";
import ProfileMenu from "./ProfileMenu";

const Navbar = ({ toggleSidebar }) => {
  return (
    <div className="navbar">
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={toggleSidebar} className="menu-btn">
          ☰
        </button>
        <h3>Silicon Valley</h3>
      </div>

      <div style={{ display: "flex", gap: "15px" }}>
        <ThemeToggle />
        <Notifications />
        <ProfileMenu />
      </div>
    </div>
  );
};

export default Navbar;