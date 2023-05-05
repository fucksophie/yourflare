import { App } from "../components/App.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { checkLoginStatus } from "../src/lib.ts";
import { Domain, User } from "../src/database.ts";
import Admin from "../islands/Admin.tsx";

export const handler: Handlers<User> = {
  async GET(req, ctx) {
    const status = (await checkLoginStatus(req));
    
    if(status[1]) {
      if(!status[1].admin) status[1] = undefined;
    }

    if(status[1] == undefined) {
      const rp = new Response("Redirecting!", {status: 307});
      rp.headers.append("Location", "/");
      return rp;
    } else {
      return ctx.render(status[1]);
    }
  },
};

export default function domain({ data }: PageProps<User>) {
  return (
    <>
      <App user={data}>
        <Admin users={User.getAllUsers()} domains={Domain.getAllDomains()}></Admin>
      </App>
    </>
  );
}
