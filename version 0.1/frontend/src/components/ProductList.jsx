import { useEffect, useState } from "react";
import API from "../api";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    API.get("/products")
      .then((res) => {
        setProducts(res.data.products);
        setAlerts(res.data.alerts);
      })
      .catch(() => alert("Failed to load products"));
  }, []);

  return (
    <div className="card">
      <h3>Products</h3>

      {alerts.map((alert, i) => (
        <p key={i} className="alert">{alert}</p>
      ))}

      {products.map((p) => (
        <div key={p.id} className="item">
          {p.name} - {p.quantity}
        </div>
      ))}
    </div>
  );
};

export default ProductList;