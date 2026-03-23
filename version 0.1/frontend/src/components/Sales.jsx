import { useState } from "react";
import API from "../api";

const Sales = () => {
  const [data, setData] = useState({
    product_id: "",
    quantity: ""
  });

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await API.post("/sales", data );
    alert("Sale added!");
    window.location.reload();
  } catch (err) {
    console.error(err.response?.data || err.message);
    alert("Error adding sale");
  }
};

  return (
    <div className="card">
      <h3>Add Sale</h3>

      <input placeholder="Product ID"
        onChange={(e)=>setData({...data,product_id:e.target.value})} />

      <input placeholder="Quantity"
        onChange={(e)=>setData({...data,quantity:e.target.value})} />

      <button onClick={handleSubmit}>Sell</button>
    </div>
  );
};

export default Sales;
