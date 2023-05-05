import { Attributes, ComponentChild } from "https://esm.sh/v117/preact@10.11.0/src/index.js";
import { Component } from "preact";
import { Buttons } from "../components/Buttons.tsx";
import { ToastDefault } from "./Login.tsx";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'

interface DashboardAttributes extends Attributes {
  admin?: boolean;
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
        const request = await fetch("/api/deleteuser")
        const json = await request.json();

        if(request.ok) {
          Toastify({
            ...ToastDefault,
            text: "Account deleted."
          }).showToast();

          setTimeout(()=>{
            location.href = "/"
          }, 1000)
        } else {
          Toastify({
            ...ToastDefault,
            text: json.error,
          }).showToast();
        }
      }
    });
    toast.showToast();
  }
  
  render(): ComponentChild {
    return (
      <>
        <h1 class="text-2xl">dashboard</h1>
        <Buttons>
          <a href="/domains">your domains</a>
          <button onClick={() => this.deleteAccount()}>delete your account</button>
        </Buttons>
      </>
    );
  }
}
