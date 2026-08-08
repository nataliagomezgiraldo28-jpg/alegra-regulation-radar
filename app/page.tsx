import Dashboard from "@/components/Dashboard";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const state = await getState();
  return <Dashboard initial={state} />;
}
