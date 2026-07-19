import { createSearchProgressGetHandler } from "../../../../lib/searchProgressStore.ts";

// Lightweight polling endpoint for live search-progress narration. The id is
// a client-generated opaque token sent with the recommendation POST; unknown
// or expired ids answer `status: "unknown"` so the client can fall back to
// its generic loading copy.
export const GET = createSearchProgressGetHandler();
