import { App } from "../components/App.tsx";
import Login from "../islands/Login.tsx";
import { Handlers } from "$fresh/server.ts";
import { checkLoginStatus } from "../src/lib.ts";

export const handler: Handlers<null> = {
  async GET(req, ctx) {
    if((await checkLoginStatus(req))[1] != undefined) {
      const rp = new Response("Redirecting!", {status: 307});
      rp.headers.append("Location", "/dash");
      return rp;
    }
    return ctx.render();
  },
};

export default function login() {
  return (
    <>
      <App>
        <Login></Login>
      </App>
    </>
  );
}
