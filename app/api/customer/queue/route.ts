import { loadState } from "../_lib";

export async function GET() {
  try {
    const { state, configured } = await loadState();
    if (!configured) {
      // Graceful demo data when backend isn't wired up
      return Response.json({ cars: 0, mins: 0, configured: false });
    }
    const lane = (state.liveLane as unknown[]) || [];
    return Response.json({ cars: lane.length, mins: lane.length * 4, configured: true });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
