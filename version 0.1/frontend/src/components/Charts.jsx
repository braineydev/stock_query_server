import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import API from "../api";

const Charts = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/products/most_sold");
      
        if (Array.isArray(res.data)) setData(res.data);
      } catch (err) {
        console.error("Chart API error:", err);
      }
    };

    fetchData();
  }, []);

  if (data.length === 0) return <p>Loading charts...</p>;

  return (
    <div className="grid">
      {/* BAR CHART */}
      
      <div className="card">
        <h3>Most Sold Products - Bar</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LINE CHART */}
      <div className="card">
        <h3>Most Sold Products - Line</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PIE CHART */}
      <div className="card">
        <h3>Most Sold Products - Pie</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" outerRadius={100} fill="#3b82f6" label />
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;