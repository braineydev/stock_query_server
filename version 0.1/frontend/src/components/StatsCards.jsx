import { useEffect, useState } from "react";
import API from "../api";

const StatsCards = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    total_sales: 0,
    total_revenue: 0,
    low_stock: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get("/dashboard/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Stats error:", err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="stats">
      <div className="stat">
        <h3>{stats.total_products}</h3>
        <p>Products</p>
      </div>

      <div className="stat">
        <h3>{stats.total_sales}</h3>
        <p>Sales</p>
      </div>

      <div className="stat">
        <h3>${stats.total_revenue.toFixed(2)}</h3>
        <p>Revenue</p>
      </div>

      <div className="stat">
        <h3 style={{ color: stats.low_stock > 0 ? "#ef4444" : "" }}>
          {stats.low_stock}
        </h3>
        <p>Low Stock</p>
      </div>
    </div>
  );
};

export default StatsCards;