import { Attributes, ComponentChild } from "https://esm.sh/v117/preact@10.11.0/src/index.js";
import { Component } from "preact";
import { Buttons } from "../components/Buttons.tsx";
import { ToastDefault } from "./Login.tsx";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import { User } from "../src/database.ts";
import { request } from "../src/misc.tsx";

interface DashboardAttributes extends Attributes {
  user?: User;
}

export default class Dashboard extends Component {
  props: DashboardAttributes;
  
  constructor(props: DashboardAttributes) {
    super(props);
    this.props = props;
  }
  
  deleteAccount() {
    const toast = Toastify({
      ...ToastDefault,
      text: "Are you sure that you want to delete your account? (click!)",
      onClick: async () => {
        toast.hideToast();
        await request("/api/deleteuser", "Account deleted.", () => {
          setTimeout(()=>{
            location.href = "/"
          }, 1000)
        })
      }
    });
    toast.showToast();
  }
  
  render(): ComponentChild {
    return (
      <>
        <h1 class="text-2xl">dashboard</h1>
        <Buttons rotation="hort">
          <button onClick={async () => await request("/api/changepassword?password="+encodeURIComponent((document.getElementById("password") as HTMLInputElement).value), "Password changed.")}>change password</button>
          <button onClick={async () => await request("/api/email?action=verify&email="+encodeURIComponent((document.getElementById("email") as HTMLInputElement).value), "Email changed.")}>change email</button>
          {
            (() => {
              if(this.props.user?.email.email) {
                return <button onClick={async () => await request("/api/email?action=remove", "Email removed!")}>remove email</button>
              }
            })()
          }
        </Buttons>

        <div>
          <input type='password' class="w-48 border-slate-200 border-2 rounded" id="password" placeholder="*******"></input>
          <input type='email' class="mx-2 w-48 border-slate-200 border-2 rounded" id="email" placeholder={
            (()=>{
              if(!this.props.user?.email.email) {
                return "no email has been set";
              }
              if(this.props.user?.email.status == "unverified") {
                return "verifying " + this.props.user?.email.email;
              }
              return "your email";
            })()
          } value={
            (()=>{
              if(!this.props.user?.email.email) return "";
              if(this.props.user?.email.status == "verified") {
                return this.props.user.email.email;
              } else {
                return "";
              }
            })()
          }></input>
        </div>
        <Buttons>
          <a href="/domains">your domains</a>
          <button onClick={() => this.deleteAccount()}>delete your account</button>
        </Buttons>
      </>
    );
  }
}
