import { Handlers, PageProps } from "$fresh/server.ts";
import { App } from "../components/App.tsx";
import { Buttons } from "../components/Buttons.tsx";
import { Domain, User } from "../src/database.ts";
import { checkLoginStatus } from "../src/lib.ts";
import { buttonClass, Hr } from "../src/misc.tsx";

export const handler: Handlers<User> = {
  async GET(req, ctx) {
    const status = (await checkLoginStatus(req));
    if(status[1] == undefined) {
      const rp = new Response("Redirecting!", {status: 307});
      rp.headers.append("Location", "/");
      return rp;
    } else {
      return ctx.render(status[1]);
    }
  },
};

export default function domains({ data }: PageProps<User>) {
  const domains = data.domains.map(z => {
    return <a href={"/domain?id="+z}>{Domain.findId(z)?.zone}</a>
  })

  return (
    <>
      <App user={data}>
        <h1 class="text-2xl">your domains</h1>
        <Hr></Hr>
        
        <Buttons rotation="vert">
          {domains}
        </Buttons>

        <a href="/adddomain" class={buttonClass}>Link a new domain</a>
      </App>
    </>
  );
}
