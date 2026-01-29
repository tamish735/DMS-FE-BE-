import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create user form
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "vendor",
  });

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     ROLE CHECK (UI GUARD)
  ========================= */
  let role = "vendor";
  try {
    const decoded = jwtDecode(token);
    role = decoded.role;
  } catch {}

  const isAdmin = role === "admin";
  const isSuperAdmin = role === "super_admin";
  const isAdminPlus = isAdmin || isSuperAdmin;

  /* =========================
     FETCH USERS
  ========================= */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/users", {
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminPlus) fetchUsers();
    else setLoading(false);
  }, [isAdminPlus]);

  /* =========================
     ACTIONS
  ========================= */
  const toggleStatus = async (user) => {
    if (!window.confirm("Are you sure?")) return;

    await fetch("http://localhost:5001/users/toggle-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        user_id: user.id,
        is_active: !user.is_active,
      }),
    });

    fetchUsers();
  };

  const resetPassword = async (user) => {
    const newPassword = window.prompt("Enter new password");
    if (!newPassword) return;

    await fetch("http://localhost:5001/users/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        user_id: user.id,
        new_password: newPassword,
      }),
    });

    alert("Password reset successfully");
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("Missing fields");
      return;
    }

    await fetch("http://localhost:5001/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(newUser),
    });

    setNewUser({ username: "", password: "", role: "vendor" });
    fetchUsers();
  };

  /* =========================
     GUARDS
  ========================= */
  if (!isAdminPlus) return null;
  if (loading) return <p>Loading users...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd" }}>
      <h3>User Management</h3>

      {/* CREATE USER */}
      <div style={{ marginBottom: 16 }}>
        <h4>Create User</h4>
        <input
          placeholder="Username"
          value={newUser.username}
          onChange={(e) =>
            setNewUser({ ...newUser, username: e.target.value })
          }
        />
        <input
          placeholder="Password"
          type="password"
          value={newUser.password}
          onChange={(e) =>
            setNewUser({ ...newUser, password: e.target.value })
          }
        />
        <select
          value={newUser.role}
          onChange={(e) =>
            setNewUser({ ...newUser, role: e.target.value })
          }
        >
          {isSuperAdmin && <option value="admin">Admin</option>}
          <option value="vendor">Vendor</option>
        </select>
        <button onClick={createUser}>Create</button>
      </div>

      {/* USER LIST */}
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? "Active" : "Disabled"}</td>
              <td>
                <button onClick={() => toggleStatus(u)}>
                  {u.is_active ? "Disable" : "Enable"}
                </button>{" "}
                <button onClick={() => resetPassword(u)}>
                  Reset Password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserList;