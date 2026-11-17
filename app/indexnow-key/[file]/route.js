// The IndexNow key file. next.config.mjs rewrites /<anything>.txt that could be a key to this route, which
// answers only for the key in INDEXNOW_KEY, so the public path /<key>.txt follows the variable. Read per
// request: changing the key needs a restart, not a rebuild. Unset means 404.
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const key = process.env.INDEXNOW_KEY;
  const { file } = await params;
  if (!key || file !== `${key}.txt`) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
