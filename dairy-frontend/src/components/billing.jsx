import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SearchableSelect from "./SearchableSelect";
import InvoiceView from "./InvoiceView";

function Billing() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  const [cart, setCart] = useState([]);

  const [cashPaid, setCashPaid] = useState("");
  const [onlinePaid, setOnlinePaid] = useState("");

  const [stockMap, setStockMap] = useState({});
  const [quantityError, setQuantityError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH CUSTOMERS & PRODUCTS
  ========================= */
  useEffect(() => {
    fetch("http://localhost:5001/customers/active", {
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
     FETCH AVAILABLE STOCK
  ========================= */
  useEffect(() => {
    if (!productId) return;

    fetch(`http://localhost:5001/stock/available/${productId}`, {
      headers: { Authorization: authHeader },
    })
      .then(res => res.json())
      .then(data =>
        setStockMap(prev => ({
          ...prev,
          [productId]: Number(data.available_stock ?? 0),
        }))
      )
      .catch(() =>
        setStockMap(prev => ({ ...prev, [productId]: 0 }))
      );
  }, [productId]);

  /* =========================
     FETCH PRICE (PREVIEW)
  ========================= */
  useEffect(() => {
    if (!customerId || !productId) {
      setUnitPrice(0);
      return;
    }

    const product = products.find(p => p.id === Number(productId));
    const defaultPrice = product?.default_price ?? 0;

    fetch(`http://localhost:5001/customers/${customerId}/prices`, {
      headers: { Authorization: authHeader },
    })
      .then(res => res.json())
      .then(data => {
        const match = Array.isArray(data)
          ? data.find(p => p.product_id === Number(productId))
          : null;

        setUnitPrice(
          match ? Number(match.custom_price) : Number(defaultPrice)
        );
      })
      .catch(() => setUnitPrice(Number(defaultPrice)));
  }, [customerId, productId, products]);

  /* =========================
     HELPERS
  ========================= */
  const usedInCart = pid =>
    cart.reduce(
      (sum, row) =>
        row.product_id === pid ? sum + row.quantity : sum,
      0
    );

  /* =========================
     ADD TO CART
  ========================= */
  const addToCart = () => {
    const qty = Number(quantity);
    const available = stockMap[productId] ?? 0;
    const used = usedInCart(Number(productId));

    if (!qty || qty <= 0) {
      setQuantityError("Enter valid quantity");
      return;
    }

    if (qty > available - used) {
      setQuantityError(`Only ${available - used} units available`);
      return;
    }

    const product = products.find(p => p.id === Number(productId));

    setCart(prev => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        rate: unitPrice,
        amount: qty * unitPrice,
      },
    ]);

    setProductId("");
    setQuantity("");
    setUnitPrice(0);
    setQuantityError("");
  };

  /* =========================
     CART EDIT ACTIONS
  ========================= */
  const increaseQty = index => {
    setCart(prev => {
      const item = prev[index];
      const available = stockMap[item.product_id] ?? 0;
      const used = usedInCart(item.product_id) - item.quantity;

      if (item.quantity + 1 > available - used) {
        toast.error("No more stock available");
        return prev;
      }

      const updated = [...prev];
      updated[index] = {
        ...item,
        quantity: item.quantity + 1,
        amount: (item.quantity + 1) * item.rate,
      };
      return updated;
    });
  };

  const decreaseQty = index => {
    setCart(prev => {
      const item = prev[index];
      if (item.quantity === 1) return prev;

      const updated = [...prev];
      updated[index] = {
        ...item,
        quantity: item.quantity - 1,
        amount: (item.quantity - 1) * item.rate,
      };
      return updated;
    });
  };

  const removeItem = index => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  /* =========================
     TOTALS
  ========================= */
  const totalAmount = cart.reduce((s, i) => s + i.amount, 0);
  const cash = Number(cashPaid) || 0;
  const online = Number(onlinePaid) || 0;
  const paidTotal = cash + online;
  const due = totalAmount - paidTotal;

  useEffect(() => {
    setPaymentError(
      paidTotal > totalAmount ? "Payment exceeds total amount" : ""
    );
  }, [paidTotal, totalAmount]);

  /* =========================
     SUBMIT BILL
  ========================= */
  const handleSubmit = async () => {
    if (!customerId || cart.length === 0 || paymentError) return;

    try {
      setSubmitting(true);

      const res = await fetch("http://localhost:5001/billing/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          customer_id: Number(customerId),
          items: cart.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
          payment: { cash, online },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(`Invoice ${data.invoice_id} generated`);

      setActiveInvoiceId(data.invoice_id);
      setCustomerId("");
      setCart([]);
      setCashPaid("");
      setOnlinePaid("");
    } catch (err) {
      toast.error(err.message || "Billing failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Billing</h3>

        <label>Customer</label>
        <SearchableSelect
          options={customers}
          value={customerId}
          onChange={id => {
            setCustomerId(id);
            setCart([]);
          }}
        />

        <label style={{ marginTop: 12 }}>Product</label>
        <SearchableSelect
          options={products}
          value={productId}
          disabled={!customerId}
          onChange={setProductId}
        />

        {productId && (
          <>
            <p><strong>Unit Price:</strong> ₹{unitPrice}</p>
            <p><strong>Available Stock:</strong> {stockMap[productId]}</p>

            <input
              type="number"
              value={quantity}
              placeholder="Quantity"
              onChange={e => setQuantity(e.target.value)}
            />

            {quantityError && <p style={{ color: "red" }}>{quantityError}</p>}

            <button onClick={addToCart}>Add to Cart</button>
          </>
        )}

        {cart.length > 0 && (
          <>
            <hr />
            <h4>Cart</h4>

            {cart.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong style={{ flex: 1 }}>{item.product_name}</strong>

                <button onClick={() => decreaseQty(idx)}>➖</button>
                <span>{item.quantity}</span>
                <button onClick={() => increaseQty(idx)}>➕</button>

                <span>₹{item.amount}</span>

                <button
                  onClick={() => removeItem(idx)}
                  style={{ color: "red" }}
                >
                  🗑
                </button>
              </div>
            ))}

            <p><strong>Total:</strong> ₹{totalAmount}</p>
          </>
        )}

        <label>Cash Paid</label>
        <input value={cashPaid} onChange={e => setCashPaid(e.target.value)} />

        <label>Online Paid</label>
        <input value={onlinePaid} onChange={e => setOnlinePaid(e.target.value)} />

        {paymentError && <p style={{ color: "red" }}>{paymentError}</p>}
        <p><strong>Due:</strong> ₹{due > 0 ? due : 0}</p>

        <button
          onClick={handleSubmit}
          disabled={submitting || cart.length === 0 || !!paymentError}
        >
          Submit Bill
        </button>
      </div>

      {activeInvoiceId && (
        <InvoiceView
          invoiceId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
        />
      )}
    </>
  );
}

export default Billing;

// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import SearchableSelect from "./SearchableSelect";
// import InvoiceView from "./InvoiceView";

// function Billing() {
//   const [customers, setCustomers] = useState([]);
//   const [products, setProducts] = useState([]);

//   const [customerId, setCustomerId] = useState("");
//   const [productId, setProductId] = useState("");
//   const [quantity, setQuantity] = useState("");
//   const [cart, setCart] = useState([]);

//   const [cashPaid, setCashPaid] = useState("");
//   const [onlinePaid, setOnlinePaid] = useState("");

//   const [stockMap, setStockMap] = useState({});
//   const [quantityError, setQuantityError] = useState("");
//   const [paymentError, setPaymentError] = useState("");

//   const [submitting, setSubmitting] = useState(false);
//   const [activeInvoiceId, setActiveInvoiceId] = useState(null);

//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   /* =========================
//      FETCH CUSTOMERS & PRODUCTS
//   ========================= */
//   useEffect(() => {
//     fetch("http://localhost:5001/customers/active", {
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
//      FETCH AVAILABLE STOCK
//      (customer + product required)
//   ========================= */
//   useEffect(() => {
//     if (!customerId || !productId) return;

//     const pid = Number(productId);
//     if (!pid) return;

//     fetch(`http://localhost:5001/stock/available/${pid}`, {
//       headers: { Authorization: authHeader },
//     })
//       .then(res => res.json())
//       .then(data => {
//         setStockMap(prev => ({
//           ...prev,
//           [pid]: Number(data.available_qty ?? 0),
//         }));
//       })
//       .catch(() =>
//         setStockMap(prev => ({
//           ...prev,
//           [pid]: 0,
//         }))
//       );
//   }, [productId, customerId]);

//   /* =========================
//      HELPERS
//   ========================= */
//   const usedInCart = pid =>
//     cart.reduce(
//       (sum, row) =>
//         row.product_id === pid ? sum + row.quantity : sum,
//       0
//     );

//   /* =========================
//      ADD TO CART
//   ========================= */
//   const addToCart = () => {
//     if (submitting) return;

//     const qty = Number(quantity);
//     const pid = Number(productId);

//     const available = stockMap[pid] ?? 0;
//     const used = usedInCart(pid);

//     if (!qty || qty <= 0) {
//       setQuantityError("Enter a valid quantity");
//       return;
//     }

//     if (qty > available - used) {
//       setQuantityError(`Only ${available - used} units available`);
//       return;
//     }

//     const product = products.find(p => p.id === pid);

//     setCart(prev => [
//       ...prev,
//       {
//         product_id: pid,
//         product_name: product.name,
//         quantity: qty,
//       },
//     ]);

//     setProductId("");
//     setQuantity("");
//     setQuantityError("");
//   };

//   /* =========================
//      TOTALS
//   ========================= */
//   const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
//   const cash = Number(cashPaid) || 0;
//   const online = Number(onlinePaid) || 0;
//   const paidTotal = cash + online;

//   useEffect(() => {
//     setPaymentError(
//       paidTotal < 0 ? "Invalid payment amount" : ""
//     );
//   }, [paidTotal]);

//   /* =========================
//      SUBMIT BILL
//   ========================= */
//   const handleSubmit = async () => {
//     if (submitting) return;
//     if (!customerId || cart.length === 0 || paymentError) return;

//     try {
//       setSubmitting(true);

//       const res = await fetch(
//         "http://localhost:5001/billing/quick",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: authHeader,
//           },
//           body: JSON.stringify({
//             customer_id: Number(customerId),
//             items: cart.map(i => ({
//               product_id: i.product_id,
//               quantity: i.quantity,
//             })),
//             payment: { cash, online },
//           }),
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       toast.success(`Invoice ${data.invoice_id} generated`);

//       setActiveInvoiceId(data.invoice_id);
//       setCustomerId("");
//       setProductId("");
//       setCart([]);
//       setCashPaid("");
//       setOnlinePaid("");
//       setStockMap({});
//     } catch (err) {
//       toast.error(err.message || "Billing failed");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <>
//       <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
//         <h3>Billing</h3>

//         <label>Customer</label>
//         <SearchableSelect
//           options={customers}
//           value={customerId}
//           disabled={submitting}
//           onChange={id => {
//             setCustomerId(id);
//             setProductId("");
//             setCart([]);
//             setStockMap({});
//           }}
//         />

//         <label style={{ marginTop: 12 }}>Product</label>
//         <SearchableSelect
//           options={products}
//           value={productId}
//           disabled={!customerId || submitting}
//           onChange={setProductId}
//         />

//         {productId && (
//           <>
//             <p>
//               Available Stock:{" "}
//               <strong>{stockMap[Number(productId)] ?? 0}</strong>
//             </p>

//             <input
//               type="number"
//               value={quantity}
//               placeholder="Quantity"
//               disabled={submitting}
//               onChange={e => setQuantity(e.target.value)}
//             />

//             {quantityError && (
//               <p style={{ color: "red" }}>{quantityError}</p>
//             )}

//             <button onClick={addToCart} disabled={submitting}>
//               Add to Cart
//             </button>
//           </>
//         )}

//         {cart.length > 0 && (
//           <>
//             <hr />
//             <h4>Cart</h4>
//             {cart.map((item, idx) => (
//               <div key={idx} style={{ display: "flex", gap: 8 }}>
//                 <strong style={{ flex: 1 }}>
//                   {item.product_name}
//                 </strong>
//                 <span>Qty: {item.quantity}</span>
//               </div>
//             ))}
//             <p>
//               <strong>Total Quantity:</strong> {totalQty}
//             </p>
//           </>
//         )}

//         <label>Cash Paid</label>
//         <input
//           value={cashPaid}
//           disabled={submitting}
//           onChange={e => setCashPaid(e.target.value)}
//         />

//         <label>Online Paid</label>
//         <input
//           value={onlinePaid}
//           disabled={submitting}
//           onChange={e => setOnlinePaid(e.target.value)}
//         />

//         {paymentError && (
//           <p style={{ color: "red" }}>{paymentError}</p>
//         )}

//         <button
//           onClick={handleSubmit}
//           disabled={submitting || cart.length === 0 || !!paymentError}
//         >
//           {submitting ? "Submitting..." : "Submit Bill"}
//         </button>
//       </div>

//       {activeInvoiceId && (
//         <InvoiceView
//           invoiceId={activeInvoiceId}
//           onClose={() => setActiveInvoiceId(null)}
//         />
//       )}
//     </>
//   );
// }

// export default Billing;