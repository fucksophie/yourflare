import { ComponentChild } from "https://esm.sh/v117/preact@10.11.0/src/index.js";
import { buttonClass } from "../routes/index.tsx";
import { Component } from "preact";
import Toastify from 'https://esm.sh/toastify-js@1.12.0'
import {asset} from "$fresh/runtime.ts";
import { ToastDefault } from "./Login.tsx";

export default class Register extends Component {
  async register(username: string, password: string) {
    const request = await fetch(`/api/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      credentials: "same-origin"
    })

    const json = await request.json();
    
    if(request.ok) {
      Toastify({
        ...ToastDefault,
        text: "Registered!",
      }).showToast();
      location.href = "/login"
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

    await this.register(username.trim(), password.trim());
  }

  render(): ComponentChild {
    return (
      <>
        <link rel="stylesheet" href={asset("toastify.css")} />
        <h1 class="text-2xl">register</h1>

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
          register
        </button>
      </>
    );
  }
}
