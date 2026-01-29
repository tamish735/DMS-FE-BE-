import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SearchableSelect from "./SearchableSelect";
import { jwtDecode } from "jwt-decode";

function CustomerPricing() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);

  /* =========================
     AUTH + ROLE
  ========================= */
  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role || null);
    } catch {
      setRole(null);
    }
  }, [token]);

  const isAdminPlus = role === "admin" || role === "super_admin";

  /* =========================
     FETCH CUSTOMERS + PRODUCTS
  ========================= */
  useEffect(() => {
    fetch("http://localhost:5001/customers", {
      headers: { Authorization: authHeader },
    })
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []));

    fetch("http://localhost:5001/products", {
      headers: { Authorization: authHeader },
    })
      .then(res => res.json())
      .then(data =>
        setProducts(Array.isArray(data.products) ? data.products : [])
      );
  }, []);

  /* =========================
     FETCH CUSTOMER PRICES
  ========================= */
  const fetchPrices = async (cid) => {
    if (!cid) return;

    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:5001/customers/${cid}/prices`,
        { headers: { Authorization: authHeader } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPrices(Array.isArray(data) ? data : []);
      setEditing({});
    } catch (err) {
      toast.error(err.message || "Failed to load prices");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     HELPERS
  ========================= */
  const getCustomPrice = (productId) =>
    prices.find(p => p.product_id === productId)?.custom_price ?? "";

  /* =========================
     SAVE PRICE
  ========================= */
  const savePrice = async (productId) => {
    if (!isAdminPlus) {
      toast.error("Admin access required");
      return;
    }

    const price = editing[productId];

    if (!price || Number(price) <= 0) {
      toast.error("Enter valid price");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5001/customers/${customerId}/prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            product_id: productId,
            custom_price: Number(price),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Custom price saved");
      fetchPrices(customerId);
    } catch (err) {
      toast.error(err.message || "Failed to save price");
    }
  };

  /* =========================
     REMOVE PRICE
  ========================= */
  const removePrice = async (productId) => {
    if (!isAdminPlus) {
      toast.error("Admin access required");
      return;
    }

    if (!window.confirm("Remove custom price?")) return;

    try {
      const res = await fetch(
        `http://localhost:5001/customers/${customerId}/prices/${productId}`,
        {
          method: "DELETE",
          headers: { Authorization: authHeader },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Custom price removed");
      fetchPrices(customerId);
    } catch (err) {
      toast.error(err.message || "Failed to remove price");
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Customer-Specific Pricing</h3>

      {!isAdminPlus && (
        <p style={{ color: "orange" }}>
          You have read-only access.
        </p>
      )}

      {/* CUSTOMER */}
      <label>Customer</label>
      <SearchableSelect
        options={customers}
        value={customerId}
        onChange={(id) => {
          setCustomerId(id);
          setEditing({});
          fetchPrices(id);
        }}
        placeholder="Select customer"
      />

      {customerId && (
        <>
          <hr />
          {loading && <p>Loading prices…</p>}

          {!loading && (
            <table width="100%" border="1" cellPadding="6">
              <thead>
                <tr>
                  <th align="left">Product</th>
                  <th align="right">Default Price</th>
                  <th align="right">Custom Price</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const custom = getCustomPrice(p.id);

                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td align="right">
                        {p.default_price !== null ? `₹${p.default_price}` : "—"}
                      </td>
                      <td align="right">
                        <input
                          type="number"
                          value={editing[p.id] ?? custom}
                          disabled={!isAdminPlus}
                          onChange={(e) =>
                            setEditing(prev => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <button
                          disabled={!isAdminPlus}
                          onClick={() => savePrice(p.id)}
                        >
                          Save
                        </button>

                        {custom !== "" && (
                          <button
                            disabled={!isAdminPlus}
                            onClick={() => removePrice(p.id)}
                            style={{ marginLeft: 8, color: "red" }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default CustomerPricing;





// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import SearchableSelect from "./SearchableSelect";

// function CustomerPricing() {
//   const [customers, setCustomers] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [prices, setPrices] = useState([]);

//   const [customerId, setCustomerId] = useState("");
//   const [editing, setEditing] = useState({}); // productId -> price
//   const [loading, setLoading] = useState(false);

//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   /* =========================
//      FETCH CUSTOMERS + PRODUCTS
//   ========================= */
//   useEffect(() => {
//     fetch("http://localhost:5001/customers", {
//       headers: { Authorization: authHeader },
//     })
//       .then(res => res.json())
//       .then(data => setCustomers(Array.isArray(data) ? data : []));

//     fetch("http://localhost:5001/products", {
//       headers: { Authorization: authHeader },
//     })
//       .then(res => res.json())
//       .then(data =>
//         setProducts(Array.isArray(data.products) ? data.products : [])
//       );
//   }, []);

//   /* =========================
//      FETCH CUSTOMER PRICES
//   ========================= */
//   const fetchPrices = async (cid) => {
//     if (!cid) return;

//     try {
//       setLoading(true);
//       const res = await fetch(
//         `http://localhost:5001/customers/${cid}/prices`,
//         { headers: { Authorization: authHeader } }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setPrices(Array.isArray(data) ? data : []);
//     } catch (err) {
//       toast.error(err.message || "Failed to load prices");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* =========================
//      SAVE PRICE
//   ========================= */
//   const savePrice = async (productId) => {
//     const price = editing[productId];
//     if (!price || Number(price) <= 0) {
//       toast.error("Enter valid price");
//       return;
//     }

//     try {
//       const res = await fetch(
//         `http://localhost:5001/customers/${customerId}/prices`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: authHeader,
//           },
//           body: JSON.stringify({
//             product_id: productId,
//             custom_price: Number(price),
//           }),
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success("Custom price saved");
//       fetchPrices(customerId);
//     } catch (err) {
//       toast.error(err.message || "Failed to save price");
//     }
//   };

//   /* =========================
//      REMOVE PRICE
//   ========================= */
//   const removePrice = async (productId) => {
//     if (!window.confirm("Remove custom price?")) return;

//     try {
//       const res = await fetch(
//         `http://localhost:5001/customers/${customerId}/prices/${productId}`,
//         {
//           method: "DELETE",
//           headers: { Authorization: authHeader },
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success("Custom price removed");
//       fetchPrices(customerId);
//     } catch (err) {
//       toast.error(err.message || "Failed to remove price");
//     }
//   };

//   const getCustomPrice = (productId) =>
//     prices.find(p => p.product_id === productId)?.custom_price ?? "";

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
//       <h3>Customer-Specific Pricing</h3>

//       {/* CUSTOMER */}
//       <label>Customer</label>
//       <SearchableSelect
//         options={customers}
//         value={customerId}
//         onChange={(id) => {
//           setCustomerId(id);
//           setEditing({});
//           fetchPrices(id);
//         }}
//         placeholder="Select customer"
//       />

//       {customerId && (
//         <>
//           <hr />
//           {loading && <p>Loading prices…</p>}

//           {!loading && (
//             <table width="100%" border="1" cellPadding="6">
//               <thead>
//                 <tr>
//                   <th align="left">Product</th>
//                   <th align="right">Default Price</th>
//                   <th align="right">Custom Price</th>
//                   <th align="left">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {products.map(p => {
//                   const custom = getCustomPrice(p.id);
//                   return (
//                     <tr key={p.id}>
//                       <td>{p.name}</td>
//                       <td align="right">₹{p.default_price}</td>
//                       <td align="right">
//                         <input
//                           type="number"
//                           value={editing[p.id] ?? custom}
//                           onChange={(e) =>
//                             setEditing(prev => ({
//                               ...prev,
//                               [p.id]: e.target.value,
//                             }))
//                           }
//                           style={{ width: 80 }}
//                         />
//                       </td>
//                       <td>
//                         <button onClick={() => savePrice(p.id)}>
//                           Save
//                         </button>
//                         {custom !== "" && (
//                           <button
//                             onClick={() => removePrice(p.id)}
//                             style={{ marginLeft: 8, color: "red" }}
//                           >
//                             Remove
//                           </button>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// export default CustomerPricing;