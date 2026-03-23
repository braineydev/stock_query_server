const Sidebar = ({ sidebarOpen, setPage }) => {
  return (
    <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <h2>StockPro</h2>

      <button onClick={() => setPage("Dashboard")}>Dashboard</button>
      <button onClick={() => setPage("products")}>Products</button>
      <button onClick={() => setPage("sales")}>Add Sales</button>
      
      

      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Sidebar;