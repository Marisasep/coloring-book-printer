interface Env {
  TICKETS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  const data = await env.TICKETS.get(id);
  if (!data) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ image: data }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ params, env, request }) => {
  const id = params.id as string;
  const body = await request.json<{ image: string }>();
  if (!body.image) {
    return new Response(JSON.stringify({ error: "missing image" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  await env.TICKETS.put(id, body.image);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
