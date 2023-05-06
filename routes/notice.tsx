import { Handlers, PageProps } from "$fresh/server.ts";
import { App } from "../components/App.tsx";

export const handler: Handlers<string> = {
  GET(req, ctx) {
    const url = new URL(req.url);

    return ctx.render(url.searchParams.get("message")||"");
  },
};

export default function notice({ data }: PageProps<string>) {
  return (
    <>
      <App>
        <h1 class="text-2xl">{data}</h1>
      </App>
    </>
  );
}