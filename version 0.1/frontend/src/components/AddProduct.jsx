import { useState } from "react";
import API from "../api";

const AddProduct = () => {
  const [data, setData] = useState({
    name: "",
    price: "",
    quantity: ""
  });

  const handleAdd = async () => {
    try {
      await API.post("products/ongeza", data);
      alert("Product added");
      window.location.reload();
    } catch {
      alert("Error adding product");
    }
  };

  return (
    <div className="card">
      <h3>Add Product</h3>

      <input placeholder="Name"
        onChange={(e)=>setData({...data,name:e.target.value})} />

      <input placeholder="Price"
        onChange={(e)=>setData({...data,price:e.target.value})} />

      <input placeholder="Quantity"
        onChange={(e)=>setData({...data,quantity:e.target.value})} />

      <button onClick={handleAdd}>Add</button>
    </div>
  );
};

export default AddProduct;