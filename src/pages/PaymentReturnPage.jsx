import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PaymentReturnPage() {
  const [status, setStatus] = useState("checking"); // checking | active | pending
  const navigate = useNavigate();

  useEffect(() => {
    // Poll subscription status a few times to handle webhook delay
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const res = await base44.functions.invoke("checkSubscription", {});
        if (res.data?.active) {
          setStatus("active");
          setTimeout(() => { window.location.href = "/home"; }, 3000);
        } else if (attempts < 6) {
          setTimeout(check, 3000);
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("pending");
      }
    };
    check();
  }, []);

  return (
    <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 text-center">
      {status === "checking" && (
        <div className="space-y-4">
          <Loader2 className="w-14 h-14 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Verifying your payment...</h2>
          <p className="text-muted-foreground text-sm">Please wait, this may take a few seconds.</p>
        </div>
      )}

      {status === "active" && (
        <div className="space-y-4">
          <CheckCircle className="w-16 h-16 text-accent mx-auto" />
          <h2 className="text-2xl font-extrabold text-foreground">Payment Successful! 🎉</h2>
          <p className="text-muted-foreground text-sm">Your subscription is now active. Redirecting you to the app...</p>
          <button onClick={() => { window.location.href = "/home"; }} className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-xl">
            Go to Home
          </button>
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <XCircle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-extrabold text-foreground">Payment Pending</h2>
          <p className="text-muted-foreground text-sm">
            We haven't confirmed your payment yet. If you completed the payment, it may take a few minutes.
            Please refresh or contact support if the issue persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white font-semibold px-6 py-3 rounded-xl"
          >
            Check Again
          </button>
          <Link to="/payment" className="block text-sm text-muted-foreground underline mt-2">
            Back to Plans
          </Link>
        </div>
      )}
    </div>
  );
}