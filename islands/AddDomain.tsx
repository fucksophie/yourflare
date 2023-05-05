import { ComponentChild } from "https://esm.sh/v117/preact@10.11.0/src/index.js";
import { buttonClass } from  "../src/misc.tsx";
import { Component } from "preact";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import { ToastDefault } from "./Login.tsx";
import { settings } from "../config/settings.ts";

export default class AddDomain extends Component {
  async addDomain(zone: string) {
    const request = await fetch(`/api/adddomain?zone=${encodeURIComponent(zone)}`, {
      credentials: "same-origin"
    })

    const json = await request.json();
    
    if(request.ok) {
      Toastify({
        ...ToastDefault,
        text: json.status,
      }).showToast();
      const id = json.id;

      const waiting = setInterval(async ()=>{
        const request = await fetch("/api/domain?id="+id);
        const json = await request.json();

        if(!request.ok) {
          Toastify({
            ...ToastDefault,
            text: "Your domain failed to link. Fix your NS records."
          }).showToast();
          clearInterval(waiting)
        } else {
          if(json.status == "linked") {
            Toastify({
              ...ToastDefault,
              text: "Linked! You may now use your domain with Yourflare!"
            }).showToast();
            clearInterval(waiting)
          }
        }
      }, 2000)
    } else {
      Toastify({
        ...ToastDefault,
        text: json.error,
      }).showToast();
    }
  }

  async buttonListener() {
    const input = document.getElementById("domain") as HTMLInputElement
    if(!input.value) return;
    const parts = input.value.split(".").filter(Boolean);
    let url = input.value;
    if(parts.length > 2) url = parts.at(-2)+"."+parts.at(-1);
    await this.addDomain(url);
  }

  render(): ComponentChild {
    return (
      <>
        <h1 class="text-2xl">add domain</h1>
        <input type="text" id="domain" placeholder="example.com"></input>
        <button class={buttonClass+" my-2"} onClick={async () => await this.buttonListener()}>add domain</button>
        
        <p class="w-1/2">
          Make sure to have set up the nameservers on your domain to point to
          <strong> {settings.nameservers[0].name}</strong> and <strong>{settings.nameservers[1].name}</strong>! If you have not, this process will not go smoothly and might
          take a long time. 
          <br></br>Please check your current nameservers on your DNS resolver through:
          <br></br>Windows: nslookup -q=ns example.com
          <br></br>Linux: dig example.com NS
        </p>
      </>
    );
  }
}
