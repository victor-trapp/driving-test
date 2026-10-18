import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center animate-rise">
      <img src="/signs/616.webp" alt="" className="mb-6 size-28 rounded-md bg-white p-2" />
      <h1 className="text-2xl font-bold">No entry</h1>
      <p className="mt-2 text-muted">There's nothing at this address. It might have moved, or the link is wrong.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to the dashboard</Link>
      </Button>
    </div>
  );
}
