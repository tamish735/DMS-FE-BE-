import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------- form ---------- */
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");

  /* ---------- auth ---------- */
  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH ALL PRODUCTS
     (Active + Inactive)
  ========================= */
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/products/all", {
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* =========================
     CREATE / UPDATE PRODUCT
  ========================= */
  const submitProduct = async () => {
    if (!name || !unit) {
      toast.error("Product name and unit are required");
      return;
    }

    try {
      const url = editingId
        ? `http://localhost:5001/products/${editingId}`
        : "http://localhost:5001/products";

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name,
          unit,
          default_price: price === "" ? null : Number(price),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(editingId ? "Product updated" : "Product added");
      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    }
  };

  /* =========================
     ACTIVATE / DEACTIVATE
  ========================= */
  const deactivateProduct = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;

    try {
      const res = await fetch(
        `http://localhost:5001/products/${id}/deactivate`,
        {
          method: "PATCH",
          headers: { Authorization: authHeader },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Product deactivated");
      fetchProducts();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate product");
    }
  };

  const activateProduct = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5001/products/${id}/activate`,
        {
          method: "PATCH",
          headers: { Authorization: authHeader },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Product activated");
      fetchProducts();
    } catch (err) {
      toast.error(err.message || "Failed to activate product");
    }
  };

  /* =========================
     HELPERS
  ========================= */
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setUnit("");
    setPrice("");
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 20,
      }}
    >
      <h3>Product Management</h3>

      {/* ---------- FORM ---------- */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Unit (litre, kg, pack)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />

        <input
          type="number"
          placeholder="Default price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: 120 }}
        />

        <button onClick={submitProduct}>
          {editingId ? "Update" : "Add"}
        </button>

        {editingId && (
          <button onClick={resetForm}>Cancel</button>
        )}
      </div>

      {/* ---------- LIST ---------- */}
      {loading && <p>Loading products…</p>}

      {!loading && products.length === 0 && (
        <p>No products found.</p>
      )}

      {!loading && products.length > 0 && (
        <table
          width="100%"
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Unit</th>
              <th align="right">Price</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.unit}</td>
                <td align="right">
                  {p.default_price != null ? `₹${p.default_price}` : "-"}
                </td>
                <td>
                  <strong
                    style={{
                      color: p.is_active ? "green" : "red",
                    }}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </strong>
                </td>
                <td>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setName(p.name);
                      setUnit(p.unit);
                      setPrice(p.default_price ?? "");
                    }}
                  >
                    Edit
                  </button>

                  {p.is_active ? (
                    <button
                      onClick={() => deactivateProduct(p.id)}
                      style={{ marginLeft: 8, color: "red" }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => activateProduct(p.id)}
                      style={{ marginLeft: 8, color: "green" }}
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProductManagement;