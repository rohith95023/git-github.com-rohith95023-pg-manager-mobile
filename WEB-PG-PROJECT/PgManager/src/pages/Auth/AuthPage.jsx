import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "./AuthPage.css";

function AuthPage({ initialMode = "login" }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  
  const [signUpName, setSignUpName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpDob, setSignUpDob] = useState(""); // Added DOB state
  const [signUpGender, setSignUpGender] = useState("");
  const [signUpRole, setSignUpRole] = useState("USER");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  
  const [signInError, setSignInError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // Field-level errors

  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Toast notification state
  const [notification, setNotification] = useState({ message: "", type: "" });

  const { login, signup, googleSignIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const validateSignUp = () => {
    const errors = {};
    const nameRegex = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const phoneRegex = /^\d{10}$/; 

    if (!signUpName.trim()) {
      errors.name = "Name is required";
    } else if (signUpName.trim().length < 4) {
      errors.name = "Name must be at least 4 chars";
    } else if (signUpName.trim().length > 40) {
      errors.name = "Name must be max 40 chars";
    } else if (!nameRegex.test(signUpName.trim())) {
      errors.name = "Only alphabets and spaces allowed";
    }

    if (!signUpPhone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!phoneRegex.test(signUpPhone.trim())) {
      errors.phone = "Phone number must be exactly 10 digits";
    }

    if (!signUpDob) {
        errors.dob = "Date of Birth is required";
    } else {
        const dobDate = new Date(signUpDob);
        const dobYear = dobDate.getFullYear();
        if (dobYear < 1900 || dobYear > 2099) {
            errors.dob = "Year must be a 4-digit number between 1900 and 2099.";
        }
    }

    if (!signUpGender) {
        errors.gender = "Gender is required";
    }

    if (!signUpEmail.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(signUpEmail.trim())) {
      errors.email = "Invalid email format";
    }

    if (!signUpPassword) {
      errors.password = "Please enter a password";
    } else if (signUpPassword.length < 6 || signUpPassword.length > 16) {
      errors.password = "Password must be between 6 and 16 characters";
    }

    if (!signUpConfirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (signUpConfirmPassword.length < 6 || signUpConfirmPassword.length > 16) {
      errors.confirmPassword = "Confirm password must be between 6 and 16 characters";
    } else if (signUpConfirmPassword !== signUpPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    
    // Show first error in toast
    const firstError = Object.values(errors)[0];
    if (firstError) {
        setNotification({ message: firstError, type: "error" });
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInError("");
    setNotification({ message: "", type: "" });
    setLoading(true);

    const identifier = signInIdentifier.trim();
    const password = signInPassword.trim();

    if (!identifier || !password) {
      setSignInError("Please fill in both email/phone and password fields.");
      setLoading(false);
      return;
    }

    try {
      let email = identifier.toLowerCase();
      
      // Check if it's a phone number (10 digits)
      const isPhone = /^\d{10}$/.test(identifier);
      
      if (isPhone) {
        // Search for user with this phone number
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', identifier)
          .single();

        if (profileError || !profile) {
          setNotification({ message: "No account found with this phone number.", type: "error" });
          setLoading(false);
          return;
        }
        email = profile.email;
      }

      const { success, error } = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setNotification({ message: error || "Invalid credentials.", type: "error" });
      }
    } catch (err) {
      console.error("Login component error:", err);
      setNotification({ message: "An unexpected error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setSignInError("");
    setNotification({ message: "", type: "" });
    setLoading(true);
    
    const { success, error } = await googleSignIn();
    
    if (!success) {
      setNotification({ message: error || "Google sign in failed.", type: "error" });
      setLoading(false);
    }
    // Note: Success redirects, so we don't necessarily reset loading
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setNotification({ message: "", type: "" });
    
    if (!validateSignUp()) {
      return;
    }

    setLoading(true);

    const { success, error } = await signup(signUpEmail.trim().toLowerCase(), signUpPassword, {
      fullName: signUpName.trim(),
      phone: signUpPhone.trim(),
      role: signUpRole,
      gender: signUpGender,
      dob: signUpDob
    });

    setLoading(false);

    if (success) {
      setNotification({ message: "Registration successful!", type: "success" });
      setShowVerification(true);
      setTimeout(() => toggleToSignIn(), 1500);
      
      // Auto-hide verification card after 10 seconds
      setTimeout(() => {
        setShowVerification(false);
      }, 10000);
    } else {
      setNotification({ message: error || "Signup failed. Please try again.", type: "error" });
    }
  };

  // Toggle handlers
  const toggleToSignUp = () => {
    setIsSignUp(true);
    setSignInError("");
    setNotification({ message: "", type: "" });
    setFieldErrors({});
  };

  const toggleToSignIn = () => {
    setIsSignUp(false);
    setSignInError("");
    setNotification({ message: "", type: "" });
    setFieldErrors({});
    // Reset signup form fields
    setSignUpName("");
    setSignUpPhone("");
    setSignUpGender("");
    setSignUpRole("USER");
    setSignUpEmail("");
    setSignUpPassword("");
    setSignUpConfirmPassword("");
  };

  return (
    <div className="auth-body theme-auth-fixed" data-theme="dark">
      <header className="auth-header">
        <h1 className="glow">THE PG MANAGER</h1>
      </header>
      
      {notification.message && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {showVerification && (
        <div className="verification-card">
          <div className="card-header">
            <div className="icon-circle">
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h2>Verify your Email</h2>
          </div>
          <div className="card-body">
            <p>We've sent a verification link to your inbox.</p>
            <p className="detail">Please check your email and click the link to activate your account.</p>
          </div>
          <div className="card-footer">
            <button onClick={() => setShowVerification(false)}>Got it!</button>
          </div>
        </div>
      )}

      <div className={`auth-container ${isSignUp ? "active" : ""}`} id="container">
        {/* Sign-up Form */}
        <div className="form-container sign-up">
          <form onSubmit={handleSignUp} noValidate>
            <h1>Create Account</h1>
            <div className="input-group">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                className={fieldErrors.name ? "error-input" : ""}
                autoComplete="name"
              />
            </div>

            <div className="input-group">
                <input 
                    type={signUpDob ? "date" : "text"}
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => !signUpDob && (e.target.type = "text")}
                    name="dob"
                    placeholder="Date of Birth"
                    value={signUpDob}
                    onChange={(e) => setSignUpDob(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className={fieldErrors.dob ? "error-input" : ""}
                />
            </div>


            <div className="input-group">
                <select
                    value={signUpGender}
                    onChange={(e) => setSignUpGender(e.target.value)}
                    className={`w-full ${fieldErrors.gender ? "error-input" : ""} ${!signUpGender ? "placeholder-shown" : ""}`}
                >
                    <option value="" disabled>Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                </select>
            </div>

            <div className="input-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                className={fieldErrors.email ? "error-input" : ""}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={signUpPhone}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSignUpPhone(val);
                }}
                className={fieldErrors.phone ? "error-input" : ""}
                autoComplete="tel"
              />
            </div>

            <div className="input-group password-input-wrapper">
              <input
                type={showSignUpPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                className={fieldErrors.password ? "error-input" : ""}
                autoComplete="new-password"
                maxLength={16}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowSignUpPassword(!showSignUpPassword)}
              >
                {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="input-group password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                className={fieldErrors.confirmPassword ? "error-input" : ""}
                autoComplete="new-password"
                maxLength={16}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Removed inline error display, now using Toast */}

            <button type="submit" disabled={loading}>
              {loading ? <div className="loading-spinner"></div> : "Sign Up"}
            </button>
            <p className="switch-text mobile-only">
              Already have an account? <span onClick={toggleToSignIn}>Sign In</span>
            </p>
          </form>
        </div>

        {/* Sign-in Form */}
        <div className="form-container sign-in">
          <form id="signInForm" onSubmit={handleSignIn}>
            <h1>Sign In</h1>
            <div className="social-icons">
              <a href="#" className="social" onClick={handleGoogleSignIn}><i className="fa-brands fa-google"></i></a>
            </div>
            <input
              type="text"
              name="identifier"
              id="identifier"
              placeholder="Email or Phone Number"
              required
              value={signInIdentifier}
              onChange={(e) => {
                setSignInIdentifier(e.target.value);
                setSignInError("");
              }}
              autoComplete="username"
            />
            <div className="password-input-wrapper">
              <input
                type={showSignInPassword ? "text" : "password"}
                name="password"
                id="password"
                placeholder="Password"
                required
                value={signInPassword}
                onChange={(e) => {
                  setSignInPassword(e.target.value);
                  setSignInError("");
                }}
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowSignInPassword(!showSignInPassword)}
              >
                {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <a href="#">Forgot your password?</a>
            <button type="submit" id="signInButton" disabled={loading}>
              {loading ? <div className="loading-spinner"></div> : "Sign In"}
            </button>
            <p className="switch-text mobile-only">
              Don't have an account? <span onClick={toggleToSignUp}>Sign Up</span>
            </p>
          </form>
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button type="button" id="login" onClick={toggleToSignIn}>Sign In</button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button type="button" id="register" onClick={toggleToSignUp}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
