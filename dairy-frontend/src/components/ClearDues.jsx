import { useEffect, useState } from "react";
import SearchableSelect from "./SearchableSelect";
import toast from "react-hot-toast";

function ClearDues() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [currentDue, setCurrentDue] = useState(null);

  const [cashPaid, setCashPaid] = useState("");
  const [onlinePaid, setOnlinePaid] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successLock, setSuccessLock] = useState(false); // ✅ prevents double action after success

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH CUSTOMERS
  ========================= */
  useEffect(() => {
    fetch("http://localhost:5001/customers/active", {
      headers: { Authorization: authHeader },
    })
      .then((res) => res.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
  }, [authHeader]);

  /* =========================
     FETCH CURRENT DUE
  ========================= */
  useEffect(() => {
    if (!customerId) {
      setCurrentDue(null);
      return;
    }

    fetch(`http://localhost:5001/ledger/customer/${customerId}`, {
      headers: { Authorization: authHeader },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ledger || data.ledger.length === 0) {
          setCurrentDue(0);
          return;
        }
        const last = data.ledger[data.ledger.length - 1];
        setCurrentDue(Number(last.balance) || 0);
      })
      .catch(() => setCurrentDue(0));
  }, [customerId, authHeader]);

  /* =========================
     PAYMENT VALIDATION
  ========================= */
  const cash = Number(cashPaid) || 0;
  const online = Number(onlinePaid) || 0;
  const totalPaid = cash + online;

  useEffect(() => {
    if (currentDue === null) return;

    if (totalPaid > currentDue) {
      setPaymentError("Payment cannot exceed current due");
    } else {
      setPaymentError("");
    }
  }, [totalPaid, currentDue]);

  /* =========================
     CLEAR DUE (SAFE)
  ========================= */
  const submitPayment = async () => {
    if (submitting || successLock) return;

    if (!customerId || totalPaid <= 0) {
      toast.error("Enter valid payment");
      return;
    }

    if (paymentError) {
      toast.error(paymentError);
      return;
    }

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
          items: [],
          payment: { cash, online },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      toast.success("Due cleared successfully");

      // ✅ HARD RESET AFTER SUCCESS
      setSuccessLock(true);
      setCashPaid("");
      setOnlinePaid("");
      setCustomerId("");
      setCurrentDue(null);

      // allow new action after short pause
      setTimeout(() => setSuccessLock(false), 800);
    } catch (err) {
      toast.error(err.message || "Failed to clear due");
    } finally {
      setSubmitting(false);
    }
  };

  const hasDue = currentDue > 0;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "16px",
        marginTop: "16px",
        borderRadius: "8px",
      }}
    >
      <h3>Clear Old Dues</h3>

      {/* CUSTOMER */}
      <label>Customer</label>
      <SearchableSelect
        options={customers}
        value={customerId}
        onChange={(id) => {
          setCustomerId(id);
          setCashPaid("");
          setOnlinePaid("");
          setSuccessLock(false);
        }}
        placeholder="Search customer..."
        disabled={submitting}
      />

      {/* CURRENT DUE */}
      {currentDue !== null && (
        <p style={{ marginTop: 8 }}>
          <strong>Current Due:</strong>{" "}
          <span style={{ color: hasDue ? "red" : "green" }}>
            ₹{currentDue}
          </span>
        </p>
      )}

      {/* CASH */}
      <label>Cash Paid</label>
      <input
        type="number"
        value={cashPaid}
        disabled={!hasDue || submitting}
        onChange={(e) => setCashPaid(e.target.value)}
      />

      {/* ONLINE */}
      <label>Online Paid</label>
      <input
        type="number"
        value={onlinePaid}
        disabled={!hasDue || submitting}
        onChange={(e) => setOnlinePaid(e.target.value)}
      />

      {paymentError && (
        <p style={{ color: "red", fontSize: 13 }}>{paymentError}</p>
      )}

      <p>
        <strong>Remaining Due:</strong>{" "}
        ₹{Math.max(currentDue - totalPaid, 0)}
      </p>

      <button
        onClick={submitPayment}
        disabled={
          !hasDue ||
          totalPaid <= 0 ||
          submitting ||
          !!paymentError ||
          successLock
        }
      >
        {submitting ? "Processing..." : "Clear Due"}
      </button>
    </div>
  );
}

export default ClearDues;