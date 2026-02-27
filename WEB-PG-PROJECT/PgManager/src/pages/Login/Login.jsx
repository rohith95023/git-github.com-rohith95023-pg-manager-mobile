import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [isActive, setIsActive] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Fixed password from the original template
  const FIXED_PASSWORD = "Open@1234";

  // Toggle to Sign Up
  const handleRegister = () => {
    setIsActive(true);
    setError("");
  };

  // Toggle to Sign In
  const handleLogin = () => {
    setIsActive(false);
    setError("");
  };

  const handleSignIn = (e) => {
    e.preventDefault();

    const emailValue = email.trim();
    const passwordValue = password.trim();

    // Check if fields are empty
    if (!emailValue || !passwordValue) {
      setError("Please fill in both email and password fields.");
      return;
    }

    // Check for valid email format
    if (!emailValue.includes("@")) {
      setError("Please enter a valid email address (must contain '@').");
      return;
    }

    // Check password against fixed password
    if (passwordValue !== FIXED_PASSWORD) {
      setError("Invalid password.");
      return;
    }

    // If credentials are valid, check for admin or tenant based on email
    if (emailValue === "admin@pg.com") {
      login(emailValue, passwordValue);
      navigate("/dashboard");
    } else {
      login(emailValue, passwordValue);
      navigate("/dashboard");
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    alert("Registration successful! Please sign in.");
    setIsActive(false);
  };

  const fillAdminCredentials = () => {
    setEmail("admin@pg.com");
    setPassword("Open@1234");
    setError("");
  };

  const fillTenantCredentials = () => {
    setEmail("tenant@pg.com");
    setPassword("Open@1234");
    setError("");
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <h1 className="glow">PG MANAGEMENT SYSTEM</h1>
      </header>

      <div className={`container ${isActive ? "active" : ""}`} id="container">
        {/* Sign-up Form */}
        <div className="form-container sign-up">
          <form onSubmit={handleSignUp}>
            <h1>Create Account</h1>
            <div className="social-icons">
              <a href="#" className="social">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social">
                <i className="fa-brands fa-google"></i>
              </a>
              <a href="#" className="social">
                <i className="fa-brands fa-github"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
            <span>or use your email for registration</span>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Sign Up</button>
          </form>
        </div>

        {/* Sign-in Form */}
        <div className="form-container sign-in">
          <form id="signInForm" onSubmit={handleSignIn}>
            <h1>Sign In</h1>
            <div className="social-icons">
              <a href="#" className="social">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social">
                <i className="fa-brands fa-google"></i>
              </a>
              <a href="#" className="social">
                <i className="fa-brands fa-github"></i>
              </a>
              <a href="#" className="social">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
            <span>or use your email password</span>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
            <a href="#">Forgot your password?</a>
            <button type="button" id="signInButton" onClick={handleSignIn}>
              Sign In
            </button>

            {/* Quick fill buttons for demo */}
            <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={fillAdminCredentials}
                style={{
                  padding: "5px 15px",
                  fontSize: "10px",
                  backgroundColor: "#02052c",
                }}
              >
                Fill Admin
              </button>
              <button
                type="button"
                onClick={fillTenantCredentials}
                style={{
                  padding: "5px 15px",
                  fontSize: "10px",
                  backgroundColor: "#02052c",
                }}
              >
                Fill Tenant
              </button>
            </div>

            <p
              id="error-message"
              style={{ color: "red", display: error ? "block" : "none" }}
            >
              {error}
            </p>
          </form>
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className="hidden" id="login" onClick={handleLogin}>
                Sign In
              </button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hello, Friend!</h1>
              <p>
                Register with your personal details to use all of site features
              </p>
              <button className="hidden" id="register" onClick={handleRegister}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
