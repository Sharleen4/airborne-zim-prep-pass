import AddChildModal from "./AddChildModal";
import { useActiveChild } from "@/lib/ActiveChildContext";

// Forces the parent to create at least one child profile before using the app.
// Shown as a non-dismissable modal when the parent has zero children.
export default function FirstChildSetup() {
  const { childProfiles, loading, reload, switchChild } = useActiveChild();
  if (loading) return null;
  if (childProfiles.length > 0) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center mb-4">
        <div className="text-5xl mb-2">👋</div>
        <h1 className="text-2xl font-extrabold text-foreground">Welcome to Zama!</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Let's set up your child's profile. You can add more children later.
        </p>
      </div>
      <AddChildModal
        isOpen={true}
        canDismiss={false}
        onClose={() => {}}
        onCreated={(c) => { reload(); switchChild(c.id); }}
      />
    </div>
  );
}