import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- form ---------- */
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  /* ---------- auth ---------- */
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
     FETCH CUSTOMERS
  ========================= */
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/customers", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  /* =========================
     CREATE / UPDATE
  ========================= */
  const submitCustomer = async () => {
    if (!isAdminPlus) return toast.error("Admin access required");
    if (!name || !phone) return toast.error("Name and phone required");
    if (submitting) return;

    try {
      setSubmitting(true);

      const url = editingId
        ? `http://localhost:5001/customers/${editingId}`
        : "http://localhost:5001/customers";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(editingId ? "Customer updated" : "Customer created");
      resetForm();
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     DEACTIVATE CUSTOMER
  ========================= */
  const deactivateCustomer = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to DEACTIVATE this customer?\n\nThey will not appear in Billing, Ledger, or Clear Dues."
    );

    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:5001/customers/${id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Customer deactivated");
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate customer");
    }
  };

  /* =========================
     ACTIVATE CUSTOMER
  ========================= */
  const activateCustomer = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5001/customers/${id}/activate`,
        {
          method: "PATCH",
          headers: { Authorization: authHeader },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Customer activated");
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || "Failed to activate customer");
    }
  };

  /* =========================
     HELPERS
  ========================= */
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Customer Management</h3>

      {/* FORM */}
      {isAdminPlus && (
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Customer name"
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone"
            value={phone}
            disabled={submitting}
            onChange={(e) => setPhone(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <button onClick={submitCustomer} disabled={submitting}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          )}
        </div>
      )}

      {/* LIST */}
      {loading && <p>Loading customers…</p>}

      {!loading && customers.length === 0 && <p>No customers found.</p>}

      {!loading && customers.length > 0 && (
        <table width="100%" border="1" cellPadding="6">
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Phone</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.is_active ? "Active" : "Inactive"}</td>
                <td>
                  {isAdminPlus && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setName(c.name);
                          setPhone(c.phone);
                        }}
                      >
                        Edit
                      </button>

                      {c.is_active ? (
                        <button
                          onClick={() => deactivateCustomer(c.id)}
                          style={{ marginLeft: 8, color: "red" }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activateCustomer(c.id)}
                          style={{ marginLeft: 8, color: "green" }}
                        >
                          Activate
                        </button>
                      )}
                    </>
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

export default CustomerManagement;






// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import { jwtDecode } from "jwt-decode";

// function CustomerManagement() {
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   /* ---------- form ---------- */
//   const [editingId, setEditingId] = useState(null);
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");

//   /* ---------- auth ---------- */
//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   const [role, setRole] = useState(null);

//   useEffect(() => {
//     if (!token) return;
//     try {
//       const decoded = jwtDecode(token);
//       setRole(decoded.role || null);
//     } catch {
//       setRole(null);
//     }
//   }, [token]);

//   const isAdminPlus = role === "admin" || role === "super_admin";

//   /* =========================
//      FETCH CUSTOMERS
//   ========================= */
//   const fetchCustomers = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch("http://localhost:5001/customers", {
//         headers: { Authorization: authHeader },
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);
//       setCustomers(Array.isArray(data) ? data : []);
//     } catch (err) {
//       toast.error(err.message || "Failed to load customers");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCustomers();
//   }, []);

//   /* =========================
//      CREATE / UPDATE
//   ========================= */
//   const submitCustomer = async () => {
//     if (!isAdminPlus) return toast.error("Admin access required");
//     if (!name || !phone) return toast.error("Name and phone required");
//     if (submitting) return;

//     try {
//       setSubmitting(true);

//       const url = editingId
//         ? `http://localhost:5001/customers/${editingId}`
//         : "http://localhost:5001/customers";

//       const res = await fetch(url, {
//         method: editingId ? "PUT" : "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: authHeader,
//         },
//         body: JSON.stringify({ name, phone }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success(editingId ? "Customer updated" : "Customer created");
//       resetForm();
//       fetchCustomers();
//     } catch (err) {
//       toast.error(err.message || "Operation failed");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   /* =========================
//      DELETE CUSTOMER (CONFIRM)
//   ========================= */
//   const deleteCustomer = async (id) => {
//     if (
//       !window.confirm(
//         "This will permanently delete the customer.\nContinue?"
//       )
//     ) {
//       return;
//     }

//     try {
//       const res = await fetch(
//         `http://localhost:5001/customers/${id}`,
//         {
//           method: "DELETE",
//           headers: { Authorization: authHeader },
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success("Customer deleted");
//       fetchCustomers();
//     } catch (err) {
//       toast.error(err.message || "Failed to delete customer");
//     }
//   };

//   /* =========================
//      HELPERS
//   ========================= */
//   const resetForm = () => {
//     setEditingId(null);
//     setName("");
//     setPhone("");
//   };

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
//       <h3>Customer Management</h3>

//       {/* FORM */}
//       {isAdminPlus && (
//         <div style={{ marginBottom: 16 }}>
//           <input
//             placeholder="Customer name"
//             value={name}
//             disabled={submitting}
//             onChange={(e) => setName(e.target.value)}
//           />
//           <input
//             placeholder="Phone"
//             value={phone}
//             disabled={submitting}
//             onChange={(e) => setPhone(e.target.value)}
//             style={{ marginLeft: 8 }}
//           />
//           <button onClick={submitCustomer} disabled={submitting}>
//             {editingId ? "Update" : "Add"}
//           </button>
//           {editingId && (
//             <button onClick={resetForm} style={{ marginLeft: 8 }}>
//               Cancel
//             </button>
//           )}
//         </div>
//       )}

//       {/* LIST */}
//       {loading && <p>Loading customers…</p>}

//       {!loading && customers.length === 0 && <p>No customers found.</p>}

//       {!loading && customers.length > 0 && (
//         <table width="100%" border="1" cellPadding="6">
//           <thead>
//             <tr>
//               <th align="left">Name</th>
//               <th align="left">Phone</th>
//               <th align="left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {customers.map((c) => (
//               <tr key={c.id}>
//                 <td>{c.name}</td>
//                 <td>{c.phone}</td>
//                 <td>
//                   {isAdminPlus && (
//                     <>
//                       <button
//                         onClick={() => {
//                           setEditingId(c.id);
//                           setName(c.name);
//                           setPhone(c.phone);
//                         }}
//                       >
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => deleteCustomer(c.id)}
//                         style={{ marginLeft: 8, color: "red" }}
//                       >
//                         Delete
//                       </button>
//                     </>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// }

// export default CustomerManagement;




// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import { jwtDecode } from "jwt-decode";

// function CustomerManagement() {
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   /* ---------- form ---------- */
//   const [editingId, setEditingId] = useState(null);
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");

//   /* ---------- auth ---------- */
//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   const [role, setRole] = useState(null);

//   useEffect(() => {
//     if (!token) return;
//     try {
//       const decoded = jwtDecode(token);
//       setRole(decoded.role || null);
//     } catch {
//       setRole(null);
//     }
//   }, [token]);

//   const isAdminPlus = role === "admin" || role === "super_admin";

//   /* =========================
//      FETCH CUSTOMERS
//   ========================= */
//   const fetchCustomers = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch("http://localhost:5001/customers", {
//         headers: { Authorization: authHeader },
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);
//       setCustomers(Array.isArray(data) ? data : []);
//     } catch (err) {
//       toast.error(err.message || "Failed to load customers");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCustomers();
//   }, []);

//   /* =========================
//      CREATE / UPDATE CUSTOMER
//   ========================= */
//   const submitCustomer = async () => {
//     if (!isAdminPlus) return toast.error("Admin access required");
//     if (!name || !phone) return toast.error("Name and phone required");
//     if (submitting) return;

//     try {
//       setSubmitting(true);

//       const url = editingId
//         ? `http://localhost:5001/customers/${editingId}`
//         : "http://localhost:5001/customers";

//       const res = await fetch(url, {
//         method: editingId ? "PUT" : "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: authHeader,
//         },
//         body: JSON.stringify({ name, phone }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success(editingId ? "Customer updated" : "Customer created");
//       resetForm();
//       fetchCustomers();
//     } catch (err) {
//       toast.error(err.message || "Operation failed");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   /* =========================
//      DEACTIVATE CUSTOMER
//   ========================= */
//   const deactivateCustomer = async (id) => {
//     if (!window.confirm("Are you sure you want to deactivate this customer?")) {
//       return;
//     }

//     try {
//       const res = await fetch(
//         `http://localhost:5001/customers/${id}`,
//         {
//           method: "DELETE",
//           headers: { Authorization: authHeader },
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success("Customer deactivated");
//       fetchCustomers();
//     } catch (err) {
//       toast.error(err.message || "Failed to deactivate customer");
//     }
//   };

//   /* =========================
//      ACTIVATE CUSTOMER
//   ========================= */
//   const activateCustomer = async (id) => {
//     try {
//       const res = await fetch(
//         `http://localhost:5001/customers/${id}/activate`,
//         {
//           method: "PATCH",
//           headers: { Authorization: authHeader },
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success("Customer activated");
//       fetchCustomers();
//     } catch (err) {
//       toast.error(err.message || "Failed to activate customer");
//     }
//   };

//   /* =========================
//      HELPERS
//   ========================= */
//   const resetForm = () => {
//     setEditingId(null);
//     setName("");
//     setPhone("");
//   };

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
//       <h3>Customer Management</h3>

//       {/* FORM */}
//       {isAdminPlus && (
//         <div style={{ marginBottom: 16 }}>
//           <input
//             placeholder="Customer name"
//             value={name}
//             disabled={submitting}
//             onChange={(e) => setName(e.target.value)}
//           />
//           <input
//             placeholder="Phone"
//             value={phone}
//             disabled={submitting}
//             onChange={(e) => setPhone(e.target.value)}
//             style={{ marginLeft: 8 }}
//           />
//           <button onClick={submitCustomer} disabled={submitting}>
//             {editingId ? "Update" : "Add"}
//           </button>
//           {editingId && (
//             <button onClick={resetForm} style={{ marginLeft: 8 }}>
//               Cancel
//             </button>
//           )}
//         </div>
//       )}

//       {/* LIST */}
//       {loading && <p>Loading customers…</p>}

//       {!loading && customers.length === 0 && <p>No customers found.</p>}

//       {!loading && customers.length > 0 && (
//         <table width="100%" border="1" cellPadding="6">
//           <thead>
//             <tr>
//               <th align="left">Name</th>
//               <th align="left">Phone</th>
//               <th align="left">Status</th>
//               <th align="left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {customers.map((c) => (
//               <tr key={c.id}>
//                 <td>{c.name}</td>
//                 <td>{c.phone}</td>
//                 <td>{c.is_active ? "Active" : "Inactive"}</td>
//                 <td>
//                   {isAdminPlus && c.is_active && (
//                     <>
//                       <button
//                         onClick={() => {
//                           setEditingId(c.id);
//                           setName(c.name);
//                           setPhone(c.phone);
//                         }}
//                       >
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => deactivateCustomer(c.id)}
//                         style={{ marginLeft: 8, color: "red" }}
//                       >
//                         Deactivate
//                       </button>
//                     </>
//                   )}

//                   {isAdminPlus && !c.is_active && (
//                     <button
//                       onClick={() => activateCustomer(c.id)}
//                       style={{ color: "green" }}
//                     >
//                       Activate
//                     </button>
//                   )}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// }

// export default CustomerManagement;






// // import { useEffect, useState } from "react";
// // import toast from "react-hot-toast";
// // import { jwtDecode } from "jwt-decode";

// // function CustomerManagement() {
// //   const [customers, setCustomers] = useState([]);
// //   const [products, setProducts] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [submitting, setSubmitting] = useState(false);

// //   /* ---------- form ---------- */
// //   const [editingId, setEditingId] = useState(null);
// //   const [name, setName] = useState("");
// //   const [phone, setPhone] = useState("");

// //   /* ---------- pricing ---------- */
// //   const [pricingCustomerId, setPricingCustomerId] = useState(null);
// //   const [priceMap, setPriceMap] = useState({});

// //   /* ---------- auth ---------- */
// //   const token = localStorage.getItem("token");
// //   const authHeader = token?.startsWith("Bearer ")
// //     ? token
// //     : `Bearer ${token}`;

// //   const [role, setRole] = useState(null);

// //   useEffect(() => {
// //     if (!token) return;
// //     try {
// //       const decoded = jwtDecode(token);
// //       setRole(decoded.role || null);
// //     } catch {
// //       setRole(null);
// //     }
// //   }, [token]);

// //   const isAdminPlus = role === "admin" || role === "super_admin";

// //   /* =========================
// //      FETCH CUSTOMERS
// //   ========================= */
// //   const fetchCustomers = async () => {
// //     try {
// //       setLoading(true);
// //       const res = await fetch("http://localhost:5001/customers", {
// //         headers: { Authorization: authHeader },
// //       });
// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message);
// //       setCustomers(Array.isArray(data) ? data : []);
// //     } catch (err) {
// //       toast.error(err.message || "Failed to load customers");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   /* =========================
// //      FETCH PRODUCTS (for pricing)
// //   ========================= */
// //   const fetchProducts = async () => {
// //     try {
// //       const res = await fetch("http://localhost:5001/products", {
// //         headers: { Authorization: authHeader },
// //       });
// //       const data = await res.json();
// //       setProducts(data.products || []);
// //     } catch {
// //       setProducts([]);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchCustomers();
// //     fetchProducts();
// //   }, []);

// //   /* =========================
// //      CREATE / UPDATE CUSTOMER
// //   ========================= */
// //   const submitCustomer = async () => {
// //     if (!isAdminPlus) return toast.error("Only admin allowed");
// //     if (!name || !phone) return toast.error("Name and phone required");
// //     if (submitting) return;

// //     try {
// //       setSubmitting(true);
// //       const url = editingId
// //         ? `http://localhost:5001/customers/${editingId}`
// //         : "http://localhost:5001/customers";

// //       const res = await fetch(url, {
// //         method: editingId ? "PUT" : "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           Authorization: authHeader,
// //         },
// //         body: JSON.stringify({ name, phone }),
// //       });

// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message);

// //       toast.success(editingId ? "Customer updated" : "Customer created");
// //       resetForm();
// //       fetchCustomers();
// //     } catch (err) {
// //       toast.error(err.message || "Operation failed");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   /* =========================
// //      SAVE CUSTOMER PRICE
// //   ========================= */
// //   const savePrice = async (productId, price) => {
// //     try {
// //       const res = await fetch(
// //         "http://localhost:5001/customer-product-prices",
// //         {
// //           method: "POST",
// //           headers: {
// //             "Content-Type": "application/json",
// //             Authorization: authHeader,
// //           },
// //           body: JSON.stringify({
// //             customer_id: pricingCustomerId,
// //             product_id: productId,
// //             custom_price: price === "" ? null : Number(price),
// //           }),
// //         }
// //       );

// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message);

// //       toast.success("Price updated");
// //     } catch (err) {
// //       toast.error(err.message || "Failed to update price");
// //     }
// //   };

// //   /* =========================
// //      HELPERS
// //   ========================= */
// //   const resetForm = () => {
// //     setEditingId(null);
// //     setName("");
// //     setPhone("");
// //   };

// //   /* =========================
// //      RENDER
// //   ========================= */
// //   return (
// //     <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
// //       <h3>Customer Management</h3>

// //       {/* FORM */}
// //       <div style={{ marginBottom: 16 }}>
// //         <input
// //           placeholder="Customer name"
// //           value={name}
// //           disabled={!isAdminPlus || submitting}
// //           onChange={(e) => setName(e.target.value)}
// //         />
// //         <input
// //           placeholder="Phone"
// //           value={phone}
// //           disabled={!isAdminPlus || submitting}
// //           onChange={(e) => setPhone(e.target.value)}
// //           style={{ marginLeft: 8 }}
// //         />
// //         <button onClick={submitCustomer} disabled={!isAdminPlus || submitting}>
// //           {editingId ? "Update" : "Add"}
// //         </button>
// //         {editingId && <button onClick={resetForm}>Cancel</button>}
// //       </div>

// //       {/* LIST */}
// //       {!loading && customers.length > 0 && (
// //         <table width="100%" border="1" cellPadding="6">
// //           <thead>
// //             <tr>
// //               <th>Name</th>
// //               <th>Phone</th>
// //               <th>Actions</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {customers.map((c) => (
// //               <tr key={c.id}>
// //                 <td>{c.name}</td>
// //                 <td>{c.phone}</td>
// //                 <td>
// //                   {isAdminPlus && (
// //                     <>
// //                       <button onClick={() => setPricingCustomerId(c.id)}>
// //                         Prices
// //                       </button>
// //                     </>
// //                   )}
// //                 </td>
// //               </tr>
// //             ))}
// //           </tbody>
// //         </table>
// //       )}

// //       {/* PRICING PANEL */}
// //       {pricingCustomerId && (
// //         <div style={{ marginTop: 20 }}>
// //           <h4>Customer-specific Prices</h4>
// //           {products.map((p) => (
// //             <div key={p.id} style={{ display: "flex", gap: 8 }}>
// //               <span style={{ flex: 1 }}>
// //                 {p.name} (₹{p.default_price})
// //               </span>
// //               <input
// //                 placeholder="Custom price"
// //                 value={priceMap[p.id] || ""}
// //                 onChange={(e) =>
// //                   setPriceMap((m) => ({ ...m, [p.id]: e.target.value }))
// //                 }
// //               />
// //               <button
// //                 onClick={() => savePrice(p.id, priceMap[p.id])}
// //               >
// //                 Save
// //               </button>
// //             </div>
// //           ))}
// //           <button onClick={() => setPricingCustomerId(null)}>
// //             Close
// //           </button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default CustomerManagement;







// // // import { useEffect, useState } from "react";
// // // import toast from "react-hot-toast";
// // // import { jwtDecode } from "jwt-decode";

// // // function CustomerManagement() {
// // //   const [customers, setCustomers] = useState([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const [submitting, setSubmitting] = useState(false);

// // //   /* ---------- form ---------- */
// // //   const [editingId, setEditingId] = useState(null);
// // //   const [name, setName] = useState("");
// // //   const [phone, setPhone] = useState("");

// // //   /* ---------- auth ---------- */
// // //   const token = localStorage.getItem("token");
// // //   const authHeader = token?.startsWith("Bearer ")
// // //     ? token
// // //     : `Bearer ${token}`;

// // //   const [role, setRole] = useState(null);

// // //   useEffect(() => {
// // //     if (!token) return;
// // //     try {
// // //       const decoded = jwtDecode(token);
// // //       setRole(decoded.role || null);
// // //     } catch {
// // //       setRole(null);
// // //     }
// // //   }, [token]);

// // //   const isAdminPlus = role === "admin" || role === "super_admin";

// // //   /* =========================
// // //      FETCH CUSTOMERS
// // //   ========================= */
// // //   const fetchCustomers = async () => {
// // //     try {
// // //       setLoading(true);
// // //       const res = await fetch("http://localhost:5001/customers", {
// // //         headers: { Authorization: authHeader },
// // //       });

// // //       const data = await res.json();
// // //       if (!res.ok) throw new Error(data.message);

// // //       setCustomers(Array.isArray(data) ? data : []);
// // //     } catch (err) {
// // //       toast.error(err.message || "Failed to load customers");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   useEffect(() => {
// // //     fetchCustomers();
// // //   }, []);

// // //   /* =========================
// // //      CREATE / UPDATE
// // //   ========================= */
// // //   const submitCustomer = async () => {
// // //     if (!isAdminPlus) {
// // //       toast.error("Only admin can manage customers");
// // //       return;
// // //     }

// // //     if (!name || !phone) {
// // //       toast.error("Name and phone are required");
// // //       return;
// // //     }

// // //     if (submitting) return;

// // //     try {
// // //       setSubmitting(true);

// // //       const url = editingId
// // //         ? `http://localhost:5001/customers/${editingId}`
// // //         : "http://localhost:5001/customers";

// // //       const method = editingId ? "PUT" : "POST";

// // //       const res = await fetch(url, {
// // //         method,
// // //         headers: {
// // //           "Content-Type": "application/json",
// // //           Authorization: authHeader,
// // //         },
// // //         body: JSON.stringify({ name, phone }),
// // //       });

// // //       const data = await res.json();

// // //       if (res.status === 403) {
// // //         throw new Error("You are not authorized to perform this action");
// // //       }

// // //       if (!res.ok) throw new Error(data.message);

// // //       toast.success(editingId ? "Customer updated" : "Customer created");

// // //       resetForm();
// // //       fetchCustomers();
// // //     } catch (err) {
// // //       toast.error(err.message || "Operation failed");
// // //     } finally {
// // //       setSubmitting(false);
// // //     }
// // //   };

// // //   /* =========================
// // //      DEACTIVATE
// // //   ========================= */
// // //   const deactivateCustomer = async (id) => {
// // //     if (!isAdminPlus) {
// // //       toast.error("Only admin can deactivate customers");
// // //       return;
// // //     }

// // //     if (!window.confirm("Deactivate this customer?")) return;

// // //     try {
// // //       const res = await fetch(
// // //         `http://localhost:5001/customers/${id}`,
// // //         {
// // //           method: "DELETE",
// // //           headers: { Authorization: authHeader },
// // //         }
// // //       );

// // //       const data = await res.json();

// // //       if (res.status === 403) {
// // //         throw new Error("You are not authorized to perform this action");
// // //       }

// // //       if (!res.ok) throw new Error(data.message);

// // //       toast.success("Customer deactivated");
// // //       fetchCustomers();
// // //     } catch (err) {
// // //       toast.error(err.message || "Failed to deactivate");
// // //     }
// // //   };

// // //   /* =========================
// // //      HELPERS
// // //   ========================= */
// // //   const resetForm = () => {
// // //     setEditingId(null);
// // //     setName("");
// // //     setPhone("");
// // //   };

// // //   /* =========================
// // //      RENDER
// // //   ========================= */
// // //   return (
// // //     <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
// // //       <h3>Customer Management</h3>

// // //       {!isAdminPlus && (
// // //         <p style={{ color: "orange" }}>
// // //           You have read-only access to customers.
// // //         </p>
// // //       )}

// // //       {/* ---------- FORM ---------- */}
// // //       <div style={{ marginBottom: 16 }}>
// // //         <input
// // //           placeholder="Customer name"
// // //           value={name}
// // //           disabled={!isAdminPlus || submitting}
// // //           onChange={(e) => setName(e.target.value)}
// // //         />
// // //         <input
// // //           placeholder="Phone"
// // //           value={phone}
// // //           disabled={!isAdminPlus || submitting}
// // //           onChange={(e) => setPhone(e.target.value)}
// // //           style={{ marginLeft: 8 }}
// // //         />

// // //         <button
// // //           onClick={submitCustomer}
// // //           disabled={!isAdminPlus || submitting}
// // //           style={{ marginLeft: 8 }}
// // //         >
// // //           {submitting
// // //             ? "Saving..."
// // //             : editingId
// // //             ? "Update"
// // //             : "Add"}
// // //         </button>

// // //         {editingId && (
// // //           <button
// // //             onClick={resetForm}
// // //             disabled={submitting}
// // //             style={{ marginLeft: 8 }}
// // //           >
// // //             Cancel
// // //           </button>
// // //         )}
// // //       </div>

// // //       {/* ---------- LIST ---------- */}
// // //       {loading && <p>Loading customers…</p>}

// // //       {!loading && customers.length === 0 && (
// // //         <p>No customers found.</p>
// // //       )}

// // //       {!loading && customers.length > 0 && (
// // //         <table
// // //           width="100%"
// // //           border="1"
// // //           cellPadding="6"
// // //           style={{ borderCollapse: "collapse" }}
// // //         >
// // //           <thead>
// // //             <tr>
// // //               <th align="left">Name</th>
// // //               <th align="left">Phone</th>
// // //               <th align="right">Current Due (₹)</th>
// // //               <th align="left">Actions</th>
// // //             </tr>
// // //           </thead>
// // //           <tbody>
// // //             {customers.map((c) => (
// // //               <CustomerRow
// // //                 key={c.id}
// // //                 customer={c}
// // //                 authHeader={authHeader}
// // //                 onEdit={() => {
// // //                   setEditingId(c.id);
// // //                   setName(c.name);
// // //                   setPhone(c.phone);
// // //                 }}
// // //                 onDeactivate={() => deactivateCustomer(c.id)}
// // //                 isAdminPlus={isAdminPlus}
// // //               />
// // //             ))}
// // //           </tbody>
// // //         </table>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // /* ======================================================
// // //    CUSTOMER ROW
// // // ====================================================== */
// // // function CustomerRow({ customer, authHeader, onEdit, onDeactivate, isAdminPlus }) {
// // //   const [due, setDue] = useState(0);

// // //   useEffect(() => {
// // //     fetch(`http://localhost:5001/customers/${customer.id}/due`, {
// // //       headers: { Authorization: authHeader },
// // //     })
// // //       .then((res) => res.json())
// // //       .then((data) => setDue(Number(data.due || 0)))
// // //       .catch(() => setDue(0));
// // //   }, [customer.id]);

// // //   return (
// // //     <tr>
// // //       <td>{customer.name}</td>
// // //       <td>{customer.phone}</td>
// // //       <td align="right">{due.toFixed(2)}</td>
// // //       <td>
// // //         {isAdminPlus ? (
// // //           <>
// // //             <button onClick={onEdit}>Edit</button>
// // //             <button
// // //               onClick={onDeactivate}
// // //               style={{ marginLeft: 8, color: "red" }}
// // //             >
// // //               Deactivate
// // //             </button>
// // //           </>
// // //         ) : (
// // //           <span style={{ color: "#888" }}>—</span>
// // //         )}
// // //       </td>
// // //     </tr>
// // //   );
// // // }

// // // export default CustomerManagement;