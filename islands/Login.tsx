import { ComponentChild } from "https://esm.sh/v117/preact@10.11.0/src/index.js";
import { buttonClass } from "../routes/index.tsx";
import { Component } from "preact";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import {asset} from "$fresh/runtime.ts";

export const ToastDefault = {
  text: "Left as default, pls fix",
  duration: 3000,
  close: true,
  gravity: "bottom",
  position: "center",
} as Toastify.Options;

export default class Login extends Component {
  async login(username: string, password: string) {
    const request = await fetch(`/api/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      credentials: "same-origin"
    })

    const json = await request.json();
    
    if(request.ok) {
      Toastify({
        ...ToastDefault,
        text: "Logged in!",
      }).showToast();
      location.href = "/dash"
    } else {
      Toastify({
        ...ToastDefault,
        text: json.error,
      }).showToast();
    }
  }

  async buttonHandler() {
    const username =
      (document.getElementById("username") as HTMLInputElement).value;
    const password =
      (document.getElementById("password") as HTMLInputElement).value;
    if (!username.trim() || !password.trim()) return;

    await this.login(username.trim(), password.trim());
  }

  render(): ComponentChild {
    return (
      <>
        <link rel="stylesheet" href={asset("toastify.css")} />
        <h1 class="text-2xl">login</h1>

        <div class="mt-2">
          Username{" "}
          <input
            type="text"
            id="username"
            class="rounded border-1 border-gray-300"
          >
          </input>
        </div>
        <div class="mt-2">
          Password{" "}
          <input
            type="password"
            id="password"
            class="rounded border-1 border-gray-300"
          >
          </input>
        </div>
        <button
          onClick={async () => await this.buttonHandler()}
          class={buttonClass + " mt-2"}
        >
          login
        </button>
      </>
    );
  }
}
