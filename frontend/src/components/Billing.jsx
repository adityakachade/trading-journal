import { useState, useEffect } from "react";
import { stripeService } from "../services/stripeService";
import { authService } from "../services/authService";

function Billing() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const user = authService.getCurrentUser();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await stripeService.getSubscriptionStatus();
                setStatus(data);
            } catch (err) {
                console.error("Failed to fetch subscription status:", err);
            }
        };
        fetchStatus();
    }, []);

    const handleUpgrade = async (priceId) => {
        try {
            setLoading(true);
            const { url } = await stripeService.createCheckoutSession(priceId);
            window.location.href = url;
        } catch (err) {
            alert("Failed to initiate checkout. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleManage = async () => {
        try {
            setLoading(true);
            const { url } = await stripeService.createPortalSession();
            window.location.href = url;
        } catch (err) {
            alert("Failed to open billing portal.");
        } finally {
            setLoading(false);
        }
    };

    const tiers = [
        {
            id: "free",
            name: "Free",
            price: "₹0",
            features: ["30 Trades / month", "Basic Analytics", "Public Journal"],
            limit: "30 trades",
            isCurrent: user?.subscriptionTier === "free",
        },
        {
            id: "pro",
            name: "Pro",
            price: "₹999",
            priceId: "price_pro_id", // Replace with real ID from .env in production
            features: ["Unlimited Trades", "AI Trade Analysis", "Equity Curve", "Risk Analytics"],
            limit: "Unlimited",
            isCurrent: user?.subscriptionTier === "pro",
        },
        {
            id: "elite",
            name: "Elite",
            price: "₹1,999",
            priceId: "price_elite_id", // Replace with real ID from .env in production
            features: ["Everything in Pro", "Weekly Behavioral Reports", "Monthly Growth Plans", "Advanced Pattern Detection"],
            limit: "Unlimited",
            isCurrent: user?.subscriptionTier === "elite",
        }
    ];

    return (
        <div className="page">
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title">Manage Subscription</div>
                        <div className="card-sub">Choose a plan that fits your trading style</div>
                    </div>
                    {user?.subscriptionTier !== "free" && (
                        <button className="btn btn-ghost" onClick={handleManage} disabled={loading}>
                            Manage Billing Portal
                        </button>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 20 }}>
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className="card"
                            style={{
                                border: tier.isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                                background: tier.isCurrent ? "rgba(0, 212, 170, 0.05)" : "var(--surface)",
                                display: "flex",
                                flexDirection: "column",
                                padding: 24
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{tier.name}</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: tier.isCurrent ? "var(--accent)" : "var(--text)", marginTop: 8 }}>{tier.price}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)" }}>/mo</span></div>
                                </div>
                                {tier.isCurrent && <span className="badge badge-accent">Current Plan</span>}
                            </div>

                            <div style={{ flex: 1, marginBottom: 24 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>What's included</div>
                                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {tier.features.map((f, i) => (
                                        <li key={i} style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ color: "var(--accent)" }}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {!tier.isCurrent ? (
                                <button
                                    className={`btn ${tier.id === "elite" ? "btn-primary" : "btn-ghost"}`}
                                    onClick={() => handleUpgrade(tier.priceId)}
                                    disabled={loading || tier.id === "free"}
                                    style={{ width: "100%" }}
                                >
                                    {tier.id === "free" ? "Default Plan" : `Upgrade to ${tier.name}`}
                                </button>
                            ) : (
                                <div style={{ textAlign: "center", fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>Active</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>Subscription Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
                    <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Current Tier</div>
                        <div style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>{user?.subscriptionTier || "Free"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Status</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: status?.status === "active" ? "#00d4aa" : "#ef4444" }} />
                            <div style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>{status?.status || "Free Plan"}</div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Next Billing Date</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                            {status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : "N/A"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Billing;
