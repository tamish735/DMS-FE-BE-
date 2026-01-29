// import { useState } from "react";

// function Login() {
//     const [username, setUsername] = useState("");
//     const [password, setPassword] = useState("");
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);


//     const handleLogin = async () => {
//         setError("");
//         setLoading(true);

//         try {
//             const response = await fetch("http://localhost:5001/auth/login", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify({
//                     username,
//                     password
//                 })
//             });

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.message || "Login failed");
//             }

//             // SUCCESS
//             localStorage.setItem("token", data.token);
//             alert("Login successful");

//         } catch (err) {
//             setError(err.message);
//         } finally {
//             setLoading(false);
//         }
//     };
//     return (
//         <div style={{ maxWidth: "300px", margin: "50px auto" }}>


//             <div>
//                 <input
//                     type="text"
//                     placeholder="Username"
//                     value={username}
//                     onChange={(e) => setUsername(e.target.value)}
//                 />
//             </div>

//             <div>
//                 <input
//                     type="password"
//                     placeholder="Password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                 />
//             </div>

//             <button onClick={handleLogin} disabled={loading}>
//                 {loading ? "Logging in..." : "Login"}
//             </button>

//             {error && <p style={{ color: "red" }}>{error}</p>}
//         </div>
//     );
// }

// export default Login;


import { useState } from "react";

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Login failed");
            }

            const data = await response.json();

            localStorage.setItem("token", data.token);

            onLoginSuccess();

        } catch (err) {
            setError("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div
            style={{
                maxWidth: "400px",
                margin: "40px auto",
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
            }}
        >
            <h2 style={{ textAlign: "center" }}>Login</h2>

            <div style={{ marginBottom: "12px" }}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "16px",
                    }}
                />
            </div>

            <div style={{ marginBottom: "12px" }}>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "16px",
                    }}
                />
            </div>

            <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "16px",
                    cursor: "pointer",
                }}
            >
                {loading ? "Logging in..." : "Login"}
            </button>

            {error && (
                <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

export default Login;