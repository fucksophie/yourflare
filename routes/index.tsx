// *:･ﾟ✧(=✪ ᆺ ✪=)*:･ﾟ✧

import { App } from "../components/App.tsx";
import { Buttons } from "../components/Buttons.tsx";

export const buttonClass =
  "px-1 bg-slate-300 rounded border-[1.5px] border-solid border-sky-500 hover:border-sky-700 transition-all";

export function Hr() {
  return (
    <hr class="w-48 h-1 my-1 bg-gray-200 border-2 rounded"></hr>
  );
}

export default function index() {
  return (
    <>
      <App>
        <h1 class="text-2xl">yourflare</h1>
        <h2 class="text-xl">opensource DNS managment</h2>
        <Buttons rotation="hort">
          <a href="/login">login</a>
          <a href="/register">register</a>
        </Buttons>
      </App>
    </>
  );
}
