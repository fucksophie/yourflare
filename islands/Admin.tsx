// deno-lint-ignore-file no-explicit-any
import { Component, Attributes, ComponentChild, render, JSX  } from "preact";
import { Buttons } from "../components/Buttons.tsx";
import { request } from "../src/misc.tsx";

interface AdminAttributes extends Attributes {
  users: any[];
  domains: any[];
}

export default class Admin extends Component {
  props: AdminAttributes;
  currentUserID = "";
  currentDomainID = "";

  constructor(props: AdminAttributes) {
    super(props);
    this.props = props;
    if(typeof document !== "undefined") {
      this.changeUser();
    }
  }

  changeUser() {
    this.currentUserID = (document.getElementById("user") as HTMLSelectElement).selectedOptions[0].getAttribute("name")!;

    const domains = document.getElementById("domain")!;
    domains.innerHTML = "";
    render(this.getDomains(), domains);
    this.changeDomain();
  }
  
  changeDomain() {
    setTimeout(()=>{
      const domainID = (document.getElementById("domain") as HTMLSelectElement).selectedOptions[0].getAttribute("name")!;
      this.currentDomainID = domainID;
      (document.getElementById("modify") as HTMLLinkElement).href = "/domain?id="+domainID.trim();
    }, 20) // TODO: weird timeout! needed however..
  }

  getDomains() {
    if(!this.currentUserID) return;
    const user = this.props.users.find(z => z.id == this.currentUserID);
    const domainsRaw = this.props.domains.filter(z => user.domains.includes(z.id));

    return domainsRaw.map(z => {
      return <option name={z.id}>{z.zone}</option>
    }) 
  }

  getUsernames() {
    return this.props.users.map((z: {username: string, id:string}) => {
      return <option name={z.id}>{z.username}</option>
    });
  }

  render(): ComponentChild {
    return (
      <>
        <h1 class="text-2xl my-2">admin panel</h1>
        
        <select id="user" class="mb-2 min-w-[100px]" onChange={(e) => this.changeUser()}>
          {this.getUsernames()}
        </select>
        
        <br></br>
        
        <select id="domain" class="mb-2 min-w-[100px]" onChange={(e) => this.changeDomain()}>
          {this.getDomains()}
        </select>

        <Buttons>
          <button onClick={async () => await request("/api/deleteuser?id="+this.currentUserID, "User deleted.")}>Delete user</button>
          <button onClick={async () => await request("/api/deletedomain?id="+this.currentDomainID, "Domain deleted.")}>Delete domain</button>
          <a id="modify">Modify domain</a>
        </Buttons>
      </>
    );
  }
}
