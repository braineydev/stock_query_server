import { useState } from "react";
import Layout from "../components/Layout";
import StatsCards from "../components/StatsCards";
import Charts from "../components/Charts";
import ProductList from "../components/ProductList";
import AddProduct from "../components/AddProduct";
import Sales from "../components/Sales";

const Dashboard = () => {
  const [page, setPage] = useState("dashboard");
  const role = localStorage.getItem("role");

  const renderPage = () => {
    switch (page) {
      case "products":
        return (
          <div className="grid">
            <ProductList />
            {role === "admin" && <AddProduct />}
          </div>
        );

      case "sales":
        return (
          <div className="grid">
            <Sales />
          </div>
        );

      case "analytics":
        return (
          <div className="grid">
            <Charts />
          </div>
        );

      default:
        return (
          <div className="grid">
            <StatsCards />
            <Charts />
          </div>
        );
    }
  };

  return (
    <Layout setPage={setPage}>
      <div className="content">{renderPage()}</div>
    </Layout>
  );
};

export default Dashboard;