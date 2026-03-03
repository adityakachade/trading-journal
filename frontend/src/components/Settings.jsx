import { useState } from "react";
import { authService } from "../services/authService";
import { userService } from "../services/userService";

function Settings() {
    const user = authService.getCurrentUser();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        currency: user?.preferences?.currency || "INR",
        theme: user?.preferences?.theme || "dark",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });
        try {
            // Mock update for now
            localStorage.setItem('user', JSON.stringify({ ...user, ...formData }));
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err) {
            setMessage({ type: "error", text: "Failed to update profile." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="card" style={{ maxWidth: 600 }}>
                <div className="card-title" style={{ marginBottom: 20 }}>Account Settings</div>

                {message.text && (
                    <div style={{
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 20,
                        background: message.type === "success" ? "rgba(0,212,170,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${message.type === "success" ? "var(--accent)" : "var(--red)"}`,
                        color: message.type === "success" ? "var(--accent)" : "var(--red)",
                        fontSize: 14
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            className="form-control"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control"
                            value={formData.email}
                            disabled
                            style={{ opacity: 0.6, cursor: "not-allowed" }}
                        />
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Email cannot be changed after registration</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="label">Preferred Currency</label>
                            <select
                                name="currency"
                                className="form-control"
                                value={formData.currency}
                                onChange={handleChange}
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="label">Default Theme</label>
                            <select
                                name="theme"
                                className="form-control"
                                value={formData.theme}
                                onChange={handleChange}
                            >
                                <option value="dark">Dark Mode</option>
                                <option value="light">Light Mode</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ maxWidth: 600, marginTop: 24, border: "1px solid var(--red-low)" }}>
                <div className="card-title" style={{ color: "var(--red)", marginBottom: 8 }}>Danger Zone</div>
                <div className="card-sub" style={{ marginBottom: 20 }}>Permanent actions that cannot be undone</div>
                <button className="btn btn-ghost" style={{ color: "var(--red)", border: "1px solid var(--red-low)" }}>
                    Delete Account
                </button>
            </div>
        </div>
    );
}

export default Settings;
