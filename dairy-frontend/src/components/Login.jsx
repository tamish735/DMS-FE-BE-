import { useState } from "react";
import logo from "../assets/logo.png"; // ✅ CORRECT IMPORT

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (loading) return;

        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) throw new Error();

            const data = await response.json();
            localStorage.setItem("token", data.token);
            onLoginSuccess();
        } catch {
            setError("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        setCapsLockOn(e.getModifierState("CapsLock"));
        if (e.key === "Enter") handleLogin();
    };

    return (
        <div
            style={{
                width: "100vw",          // 🔑 forces full width
                height: "100vh",
                backgroundColor: "#ffffff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    height: "70vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                {/* LOGO SECTION */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <img
                        src={logo}
                        alt="Brand Logo"
                        style={{ maxWidth: "220px", width: "100%" }}
                    />
                </div>

                {/* LOGIN FORM */}
                <div
                    style={{
                        width: "100%",
                        padding: "0 20px",
                    }}
                >
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={inputStyle}
                    />

                    <div style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={inputStyle}
                        />

                        {/* SHOW / HIDE ICON */}
                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "pointer",
                                fontSize: 18,
                            }}
                        >
                            {showPassword ? "🙈" : "👁"}
                        </span>
                    </div>

                    {/* CAPS LOCK WARNING */}
                    {capsLockOn && (
                        <p style={{ color: "#d97706", fontSize: 13, marginTop: 6 }}>
                            ⚠ Caps Lock is ON
                        </p>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "12px",
                            marginTop: 16,
                            fontSize: 16,
                            cursor: "pointer",
                        }}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    {error && (
                        <p
                            style={{
                                color: "red",
                                marginTop: 12,
                                textAlign: "center",
                            }}
                        >
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "12px",
    fontSize: 16,
    marginBottom: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
};

export default Login;


