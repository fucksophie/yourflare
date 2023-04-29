import { App } from "../components/App.tsx";
import { checkLoginStatus, redirect } from "../src/lib.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Domain } from "../src/database.ts";
import DomainPage from "../islands/DomainPage.tsx";
import { DomainID } from "../src/domains.ts";

type Props = { domain: Domain, admin: boolean }
export const handler: Handlers<Props> = {
  async GET(req, ctx) {
    const status = (await checkLoginStatus(req));
    if(status[1] == undefined) {
      return redirect();
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const parsedid = DomainID.safeParse(id);
    if(!parsedid.success) return redirect();
    const domain = Domain.findRawId(id!);
    if(domain.length == 0) return redirect();
    let admin = false;

    if(!status[1].domains.includes(domain[0].id)) {
      if(status[1].admin) {
        admin = true;
      } else {
        return redirect("/domains");
      }
    } 
    
    return ctx.render({
      domain: Domain.findId(domain[0].id)!,
      admin
    });
  },
};

export default function domain({ data }: PageProps<Props>) {
  return (
    <>
      <App>
        <DomainPage domain={data.domain} admin={data.admin}></DomainPage>
      </App>
    </>
  );
}
