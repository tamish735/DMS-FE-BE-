
import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/dashboard";
import { Toaster } from "react-hot-toast";


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  };



  function App() {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />
        {/* existing app */}
      </>
    );
  }


  return (
    <div style={{ padding: "20px" }}>
      <h1>Dairy Management System</h1>

      {!isLoggedIn ? (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;